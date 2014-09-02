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


module.exports = function(self, deps) {
    var orm = require('orm');
    var _ = require('underscore');
    var Q = require("q");
    var Sync = require('sql-ddl-sync').Sync;
    var g = require("grunt");
    var _db;
    var dbg = true;
    var cfg = deps.config.load();
    
    function _initDb(){
        var dfd = Q.defer();
        orm.connect("sqlite://"+cfg.path+"/migrations/history.db", function(err, db){
            if (err){
                deps.logger.exception(err);
                dfd.reject(err);
            } 
            _db = db;
            var State = db.define("state",{
                state_id: Number,
                scheme: Object,
                comment: String,
                is_error: Boolean,
                error: String
            });
            State.sync(function(){
                dfd.resolve();
            });
        });
        return dfd.promise;
    }

    function _loadState(id, cb) {
        var dfd = Q.defer();
        if ( typeof (id) == "number") {
            if (dbg)
                console.log("Try loading state: " + id);
            _db.models.state.find({
                state_id : id
            }, function(err, item) {
                if (err) {
                    deps.logger.exception(err);
                    dfd.reject(err);
                }
                if (dbg)
                    console.log("Loaded state: " + item.state_id + " Comment: " + item.comment);
                cb(item);
                dfd.resolve();
            });
        } else {
            if (dbg)
                console.log("Try loading last state... ");
            _db.models.state.find().last(function(err, stt) {
                if(err){
                    deps.logger.exception(err);
                    dfd.reject(err);
                }
                if (stt && stt.state_id) {
                    if (dbg)
                        console.log("Loaded state: " + stt.state_id + " Comment: " + stt.comment);
                } else {
                    if (dbg)
                        console.log("No migration states.");
                }
                cb(stt);
                dfd.resolve();
            });
        }
        return dfd.promise;
    }
    
    function _difference(userS, dbS) { //TODO извлечь информацию об отношениях
        var ormS = JSON.parse(JSON.stringify(dbS));
        var errs = [];
        var rmInfo = {};
        var addInfo = {};
        var toAdd = [];
        var flagNeed = false;
        for (var mdl in userS) {
            var userModel = userS[mdl];
            var sncModel = ormS[mdl];
            if (sncModel) {// find new models
                for (var atr in userModel) {// find new model attributes
                    if (!sncModel[atr]) {
                        sncModel[atr] = userModel[atr];
                        if (!addInfo[mdl])
                            addInfo[mdl] = [];
                        addInfo[mdl].push(atr);
                        flagNeed = true;
                    } else {
                        if (!_.isEqual(sncModel[atr], userModel[atr])) {//model attribute was changed - error
                            errs.push("Model: " + mdl + " Attribute: " + atr + ' was changed. Migration cannot be complete.');
                        }
                    }
                }
                for (var atr in sncModel) {// find model attrs to remove
                    if (!userModel[atr]) {
                        if (!rmInfo[mdl])
                            rmInfo[mdl] = [];
                        rmInfo[mdl].push(atr);
                        flagNeed = true;
                    }
                }
            } else {
                ormS[mdl] = userModel;
                toAdd.push(mdl);
                flagNeed = true;
            }
        }
        var toRm = [];
        for (var mdl in ormS) {
            if (!userS[mdl]){
                toRm.push(mdl);
                flagNeed = true;
            }
        }
        return {
            need: flagNeed,
            ormModels : ormS,
            rmModels : toRm,
            rmModelAttr : rmInfo,
            addModelAttr : addInfo,
            addModels : toAdd,
            errs : errs,
            hasOne: false,
            hasMany: false
        };
    }
    
    function _sync(driver_name, driver, scheme) {
        var def = Q.defer();
        if (dbg) console.log("Synced.  ---fake---");
        return Q();
//TODO       
        var sync = new Sync({
            dialect : driver_name,
            driver : driver,
            debug : function(text) {
                if(dbg) console.log("> %s", text);
            }
        });
        for (var i in scheme) {
            sync.defineCollection(i, preprocessProperties(scheme[i]));
        }
        sync.sync(function(err) {
            if (err) {
                if(dbg) console.log(">>> Sync Error: " + err);
                return def.reject(new Error(">>> Sync Error: " + err));
            } else {
                if(dbg) console.log(">>> successfull synced.");
                def.resolve();
            }
        });
        return def.promise;
    }

    function _saveState(id, obj) {
        var dfd = Q.defer();
        _db.models.state.find({"state_id":id}, function(err, res){
            if (err) {
                deps.logger.exception(err);
                dfd.reject(err);
            }
            if(res.length != 0) {
                res[0].scheme = obj;
                res[0].save(function(err){
                    if(err){
                        deps.logger.exception(err);
                        dfd.reject(err); 
                    }
                });
            }else {
                _db.models.state.create({
                    state_id : id,
                    scheme : obj,
                    comment : "no comment"
                }, function(err, res) {
                    if (err) {
                        deps.logger.exception(err);
                        dfd.reject(err);
                    }
                    if (dbg)
                        console.log("State saved: " + id);
                    dfd.resolve();
                });
            }
        });
        return dfd.promise;
    }

    function _unifyScheme(obj) { // должна унифицировать схему, чтобы не зависило от орма
        return obj;
    }

    function _loadMagic(path) {
        if (!g.file.exists(path)) return false;
        // var mgc = require(path);
        // console.log(mgc);
        return function() {
            return Q();
        };
    }

    return {
        __init__ : function() {
            var dir = cfg.path + '/migrations/';
            var driver_name; //TODO
            var driver; //TODO
            
            if (!g.file.exists(dir))
                g.file.mkdir(dir);
            if (!g.file.exists(dir+"history.db"))
                g.file.write(dir+"history.db", "");
            var magic = _loadMagic(dir + "magic.js");
            if(!magic) {
                if(dbg) console.log("No magic file");
                process.exit();
            }
            
            var usrScheme = {};
            for (var i in m.app.models) {
                usrScheme[i] = m.app.models[i].allProperties;
            }
            var dbScheme = {};
            var diff = {};
            var stateId;
            prms = _initDb()
            .then(function() {
                return _loadState(stateId, function(stt) {
                    if (stt && stt.state_id) dbScheme = stt.scheme || {};
                    else dbScheme = {};
                });
            }).then(function() {//извлекает информацию о различиях и добавляет в базу новые таблицы и колонки
                diff = _difference(usrScheme, dbScheme);
                if(diff.need){
                    //TODO б) замодуля плагинс перегрузить приложение 
                    return _sync(driver_name, driver, diff.ormModels);
                } else {
                    if(dbg) console.log("Nothing to sync.");
                    process.exit();
                }               
            }).then(function(){
                 // сохраняет текущее состояние миграции
                stateId = new Date().getTime();
                return _saveState(stateId, diff.ormModels);
            }).then(function() { // reload scope
                return deps.plugins.reloadScope(diff);
            }).then(function() {//magic
                if (magic)
                    return magic();                    
            }).then(function() { //Удаляет таблицы и колонки //TODO удалить таблицы ненужных отношений 
                var pr;
                _.reduce(diff.rmModels, function(p, i) {//remove tables
                    pr = p.then(function() {
                        var df = Q.defer();
                        m.app.models[i].drop(function(err) {
                            if (err) {
                                if(dbg) console.log("<<< Drop Error: " + err);
                                df.reject();
                            }
                            if(dbg) console.log("<<< Drop " + i);
                            df.resolve();
                        });
                        return df.promise;
                    });
                    return pr;
                }, Q());
                if (pr) 
                    return pr;
                else {
                    if (dbg) console.log("No models to remove.");
                    return Q();
                }
            }).then(function(){ // remove columns
                if(diff.rmModelAttr.length == 0){
                    if (dbg) console.log("No attributes to remove.");
                    return Q();
                } 
                return _sync(driver_name, driver, usrScheme);

            }).then(function() {//save
                return _saveState(stateId, usrScheme);
            });

            prms.done(function() {
                // process.exit();
            }, function() {

            });
            return prms;
        },
        test: function(){
            return _db.models.state;
        }
    };
}; 


