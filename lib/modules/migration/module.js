/**
 * Model migration manager - module for syncing models scheme with database tables.
 * Привет. Я и здесь тебя найду!
 *
 * В общем ситуация следующая.
 * Этот файл должен иметь две версии. Первая версия относится к загрузке в режиме миграции, и загрузке в режими
 * девелепмента и продакшена.
 *
 * В режиме миграции выполняется автоматическая обработка моделей в следующей порядке:
 *  1. Инициализируется приложение (плагин с моделями) как оно обычно происходит
 *  2. После завершении инициализации модуля plugins выполняется метод __init__ где ты выполняешь
 *      следующие операции
 *          а) составление различий между моделями
 *          б) запрос модуля плагинс перегрузить приложение,
 *              с переданными в виде объекта {<имя модели>: {<дескриптор модели>}}
 *          в) собственно сам маджик (я думаю, там даже аргументов передавать не надо, так как
 *              перезагруженный scope приложения и так будет в m.app)
 *          г) доделка синхронизации с базой данных
 *          д) формируется штамп состояния моделей и пользовательского модуля миграции, который помещается в спец файлик,
 *              а луче в базу данных sqlite (на этом я настаиваю, модуль sqlite я включил в deps).
 *              Юзерский модуль миграции, может быть удален.
 *          е) завершение работы (по идее, так как ни сервера, ни консоли нет, это должно произойти автоматом)
 *
 *  В остальных режимах работы приложения должно произойти следующее:
 *  1. Также инициализируется приложение
 *  2. Управление в определенный момент доходит до инициализации данного модуля. В данном случае в __init__
 *      выполняется составление различий между моделями в разных состояния, и делается заготовка в корне для
 *      файла миграций (если такой файл уже существует, этого не происходит)
 *
 *  Это все означает следующее: здесь у тебя появится два файла модуля:
 *      - module.js - этот файл будет для всех
 *      - module.migration.js - этот файл будет автоматически выбираться при запуске в режиме миграций
 *
 *  Это в свою очередь означает, что часть кода, которая лежит здесь должна выйти запределы файла, чтобы быть
 *      доступной во втором файле. Это точно касается функции, отвечающей за сравнение состоянии моделей
 *
 *  Мне честно говоря очень давно подправить стилистику твоего кода. Я думаю на этом файле можно будет сделать
 *      код-ревью, но я хочу, чтобы ты удалила все рудименты, я так понял у тебя есть методы и переменные, которыми
 *      ты пользоваться больше не будешь. Когда сделаешь это, я помогу тебе сделать код проще и разнести
 *      его по модулям
 *
 *  Напоследок. Надо разобраться с логикой запуска утилиты миграции. Придумать как будет указываться версионность
 *  Это необходимо для того, чтобы иметь возможность указать необходимую версию миграции для даунгрейда базы,
 *  либо создания промежуточной миграции. Также необходимо продумать формат вывода состояния миграции, а также
 *  вывода перечня всех выполненных миграций
 *
 *  На этом пока все.
 */

module.exports = function(self,deps) {
    var _ = require('underscore');
    var orm = require('orm');
    
    var ormdb;
    var crypto = require('crypto');
    var Q = require("q");
    var Sync = require('sql-ddl-sync').Sync;
    var g = require("grunt");
    var preprocessProperties = self.require("lib/properties");
    var mainPath = m.cfg.path+'/migrations/';
    var dbPath;
    var schemeFilePath;
    var magicPath;
    var db;
    var scheme = {};
    var dbHash = {};
    var dbScheme = {};
    var magicBook = {
        model:{},
        flag:{}
    };
    var full = true;
    var moduleErr;
    
    
    function difference(modelName, modelSch){
        var ret = {add:[], rm:[], chng:[], flagCreate: false};
        var bdSch = dbScheme[modelName];
        if(!bdSch){
            ret.flagCreate = true;
            ret.add = _.keys(modelSch);
            return ret;
        } 
        var newAttrs = _.keys(modelSch);
        var bdAttrs = _.keys(bdSch);
        ret.add = _.difference(newAttrs, bdAttrs);
        ret.rm = _.difference(bdAttrs, newAttrs);
        var common = _.difference(newAttrs, ret.add);
        ret.chng = _.filter(common, function(key){
            // console.log([key, modelSch[key], bdSch[key]]);
            return !_.isEqual(modelSch[key], bdSch[key]);
        });
        return ret;
    }
    function calcHash(data) {
        var hash = crypto.createHash("md5");
        hash.update(data);
        return hash.digest('hex');
    }
    
    function save(modelname, properties) {
        dbHash[modelname] = calcHash(JSON.stringify(properties));
        dbScheme[modelname] = properties;
        if(!g.file.exists(dbPath)) g.file.mkdir(dbPath);
        g.file.write(schemeFilePath, JSON.stringify({hash:dbHash, scheme: dbScheme}));
        return true;
    }
    function saveScheme(scheme) {
        for(var i in scheme)
        dbHash[i] = calcHash(JSON.stringify(scheme[i]));
        dbScheme = scheme;
        if(!g.file.exists(dbPath)) g.file.mkdir(dbPath);
        g.file.write(schemeFilePath, JSON.stringify({hash:dbHash, scheme: dbScheme}));
        return true;
    }
    function isSynced(name) {
        if(calcHash(JSON.stringify(scheme[name])) == dbHash[name]) return true;
        else return false;
    }
    function syncOne(name, properties){
        console.log(">>> Sync: " + name);
        var def = Q.defer();
        var sync = new Sync({
            dialect : db.driver_name,
            driver : db.driver,
            debug : function(text) {
                console.log("> %s", text);
            }
        });
        sync.defineCollection(name, preprocessProperties(properties));
        sync.sync(function(err) {
            if(err) {
                console.log(">>> Table: " + name + " > Sync Error: " + err);
                return def.reject(new Error(">>> Table: " + name + " > Sync Error: " + err));
            } else{
                save(name, properties);
                console.log(">>> Table: " + name + " successfull synced.");
                def.resolve();
            }
        });
        return def.promise;
    }
    function syncScheme(scheme){
        var def = Q.defer();
        var sync = new Sync({
            dialect : db.driver_name,
            driver : db.driver,
            debug : function(text) {
                console.log("> %s", text);
            }
        });
        for(var i in scheme){
            sync.defineCollection(i, preprocessProperties(scheme[i]));  
        }
        sync.sync(function(err) {
            if(err) {
                console.log(">>> Sync Error: " + err);
                return def.reject(">>> Sync Error: " + err);
            } else{
                saveScheme(scheme);
                console.log(">>> successfull synced.");
                def.resolve();
            }
        });
        return def.promise;
    }
    function done(flag){
        if(flag === false) console.log("<<< Migration module error: " + moduleErr);
        else {
            if(flag instanceof Array){
                _.each(flag, function(el){
                    console.log("<<< "+el);
                });
                return;
            }
            if(flag) console.log("<<< "+ flag);
        }
    }
    return {
        test: function(attr){
        },
        getDb: function(){
            return ormdb;
        },
        __init__: function() {
            if(!g.file.exists(mainPath)) g.file.mkdir(mainPath);
            //application scheme
            for(var i in m.app.models) {
                scheme[i] = m.app.models[i].allProperties;
            }
            //database
            return deps.database.getDatabase("default").then(function(dbs){
                db = dbs;
                //config: database scheme, hash
                dbPath = mainPath+db.driver_name+"_"+db.driver.config.database+"/";
                schemeFilePath = dbPath+"scheme.json";
                if(g.file.exists(schemeFilePath)){
                   var obj = g.file.readJSON(schemeFilePath);
                   if(obj.hash) dbHash = obj.hash;
                   if(obj.scheme) dbScheme = obj.scheme;
                } else {
                    dbHash = {}; dbScheme = {};
                }
            });
        },
        status : function(modelname) {
            console.log(">>> Migration info:");
            var fullLog = [];
            function one(name){
                var onelog = "";
                if(!isSynced(name)) {
                    onelog = "Model: "+name+" not synced. ";
                    if(full){
                        var info = difference(name, scheme[name]);
                        if(info.flagCreate) {
                            onelog +="No such table in database.";
                            fullLog.push(onelog);
                            return false; }
                        if(info.add && info.add.length !=0 ) onelog +=("Add: "+ info.add);
                        if(info.chng && info.chng.length !=0 ) onelog +=(" Change: "+ info.chng);
                        if(info.rm && info.rm.length !=0 ) onelog +=(" Remove: "+ info.rm);
                    }
                    fullLog.push(onelog);
                    return false;
                } else { 
                    fullLog.push("Model: "+name+" is synced.");
                    return true;
                }  
            }
            if(modelname){
                if(scheme[modelname]) one(modelname);
                else {
                    console.log("No model: "+modelname+" in application scheme.");
                    done(false);
                }
            }
            else {
                var need = 0;
                var all = 0;
                for(var i in scheme) {
                    all++;
                    if(!one(i)) need++; 
                }
                console.log("Need to sync: "+need+ " from "+ all+" models.");
               
            }
            _.each(fullLog, function(el){console.log("<<< "+ el)});
            return done();
        },
        sync : function(modelname) {
            if(modelname) {
                if(scheme[modelname]) {
                    if(isSynced(modelname)){
                        console.log(">>> model " + modelname + " nothing to sync.");
                        return done();
                    } 
                    var prms = syncOne(modelname, scheme[modelname]);
                    prms.done(done, function(){done(false);});
                } else {
                    console.log("No model: "+modelname+" in application scheme.");
                    return done(false);
                }
            } else {
                var prms;
                _.keys(scheme).reduce(function(p,i){
                    if(!isSynced(i))
                        prms = p.then(function(){
                            return syncOne(i,scheme[i]);
                        });
                    else prms = p;
                    return prms;
                },Q());
                prms.done(function() { 
                    done();
                }, function() {
                    done(false);
                });
            }
        },
        migrate: function(filename, force){
            var path = dbPath + filename;
            var tmpDb;
            function getTmpDb(path){
                var dfr = Q.defer();
                var prms =dfr.promise;
                orm.connect(path, function(err, dbase){
                    if(err){
                        console.log(err);
                        return dfr.reject();
                    } 
                    tmpOrmDb = dbase;
                    dfr.resolve();
                });
                return prms;
            }
            console.log(">>> Migrate: " + path);
            try {
               var magic = require(path);
               var migErr = [];
               var dfr = Q.defer();
               var prms = dfr.promise;
               var toSync = JSON.parse(JSON.stringify(dbScheme));
               var flagAdd = false;
               var flagRm = false;
               var flagForce = force;
               for(var mdl in scheme){
                   var appModel = scheme[mdl];
                   var sncModel = toSync[mdl];
                   if(sncModel){
                       for(var atr in appModel){
       //                    if(atr == "created_at" || atr == "modified_at" || atr == "id") continue;
                           if(!sncModel[atr]){ //new model attribute
                               sncModel[atr] = appModel[atr];
                               flagAdd = true;
                           }else{
                               if(!_.isEqual(sncModel[atr], appModel[atr])){ //model attribute was changed - error
                                   migErr.push("Model: "+mdl+" Attribute: "+atr+ ' was changed. Migration cannot be complete.');
                               }    
                           }
                       }
                   }else{
                       toSync[mdl] = appModel; //new model
                       flagAdd = true;
                   }
               }
               if(migErr.length != 0) return done(migErr);
                prms = prms.then(function(){ // Add tables for new models and columns for new properties
                    // console.log(_.keys(toSync.subject));
                    if(flagAdd) return syncScheme(toSync);
                    else console.log(">>> Nothing to add.");
                }).then(function(){ // The Stonehange  ------------------------------------------------
                    if(flagAdd || flagForce){
                        return getTmpDb(db.driver.config.href).then(function(){
                            _.each(toSync, function(val, key){
                                tmpOrmDb.define(key, val);
                            });
                            return magic.run(tmpOrmDb.models);
                        });
                    } 
                    else console.log(">>> Magic NOT run.");
                }).then(function(){ //remove colunms  & models
                    var toRm = [];
                    for(var mdl in toSync){
                        if(!scheme[mdl]){ 
                            toRm.push(mdl);}
                    }
                    if(toRm.length == 0){
                        console.log(">>> Nothing to remove.");
                        return syncScheme(scheme);
                    } 
                    else{
                        var pr;
                        _.reduce(toRm,function(p,i){ //remove models
                            console.log("---- reduce "+ i)
                            pr = p.then(function(){
                                console.log("---- defer")
                                var df = Q.defer();
                                tmpOrmDb.models[i].drop(function(err){
                                  if(err){
                                      console.log("<<< Drop Error: "+ err);
                                      df.reject();
                                  }
                                  console.log("<<< Drop "+i);
                                  df.resolve(); 
                               });
                               return df.promise;
                            });
                            return pr;
                        },Q());
                        if(pr){
                            return pr.then(function(){
                                console.log("----")
                                return syncScheme(scheme);  //remove colunms 
                            });
                        } else return syncScheme(scheme); //remove colunms 
                    }extra
                });
                prms.done(function(){
                    if(!flagAdd && !flagRm) console.log(">>> Nothing to migrate. Scheme is synced.");
                    else console.log("------------- MigRATION Sync Done");
                    done();
                },function(err){
                    done(err);
                });
                setTimeout(function(){dfr.resolve()}, 100);
                return prms;
           }catch (err){
               return done(err);
           }
        },
        createMagic: function(){
            // var txt = "module.exports = { /n";
//     
            // txt += "/t"+name + ":function(oldScheme){/n"+
            // +"/t};/n"
            // txt += "}"
//             
            // g.file.write(cfgPath, JSON.stringify({hash:dbHash, scheme: dbScheme}));
        }        
    };
};


function renameCols(modelname){
    var Dialect = require("./node_modules/sql-ddl-sync/lib/Dialects/" + db.driver_name);
    if(!Dialect) {
        console.log('Grunt error no dialect: ' + db.driver_name);
        return done(false);
    }
    Dialect.getCollectionProperties(db.driver, modelname, function(err, columns) {
            if(err) {
                console.log(err);
                return done(false);
            }
            console.log(columns);
        });
        function modifyOne(column){
           Dialect.modifyCollectionColumn(db.driver, modelname, column, function(err, obj) {
                if(err) {
                    console.log(err);
                    return done(false);
                }
                console.log(columns);
            }); 
        }
    
}

function nu_dialect() {
    if(!db) {
        console.log('Grunt error no database');
        return done(false);
    }
    var Dialect = require("./node_modules/sql-ddl-sync/lib/Dialects/" + db.driver_name);
    if(!Dialect) {
        console.log('Grunt error no dialect: ' + db.driver_name);
        return done(false);
    }
    var modelname = "subject";
    var properties = scheme[modelname];
    Dialect.hasCollection(db.driver, modelname, function(err, has) {
        if(err) {
            console.log(err);
            return done(false);
        }
        Dialect.getCollectionProperties(db.driver, modelname, function(err, columns) {
            if(err) {
                console.log(err);
                return done(false);
            }
            console.log(columns);
            console.log(properties);
            done();
        });
    });
}