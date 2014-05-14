/**
 * Model migration manager - module for syncing models scheme with database tables.
 * 
 */

module.exports = function(self,deps) {
    var _ = require('underscore');
    var crypto = require('crypto');
    var Q = require("q");
    var Sync = require('sql-ddl-sync').Sync;
    var g = require("grunt");
    var cfgPath = 'mysync/config.json';
    var rulePath = '../';
    var db;
    var scheme = {};
    var bdhash = {};
    var bdscheme = {};
    var magicBook = {};
    var full = true;
    var moduleErr;
    
    function difference(modelName, modelSch){
        var ret = {add:[], rm:[], chng:[], flagCreate: false};
        var bdSch = bdscheme[modelName];
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
        })
        return ret;
    }
    function calcHash(data) {
        var hash = crypto.createHash("md5");
        hash.update(data);
        return hash.digest('hex');
    }
    
    function save(modelname, properties) {
        bdhash[modelname] = calcHash(JSON.stringify(properties));
        bdscheme[modelname] = properties;
        g.file.write(cfgPath, JSON.stringify({hash:bdhash, scheme: bdscheme}));
        return true;
    }
    function isSynced(name) {
        if(calcHash(JSON.stringify(scheme[name])) == bdhash[name]) return true;
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
        sync.defineCollection(name, properties);
        sync.sync(function(err) {
            if(err) {
                console.log(">>> Table: " + name + " > Sync Error: " + err);
                return def.reject(">>> Table: " + name + " > Sync Error: " + err);
            } else{
                save(name, properties);
                console.log(">>> Table: " + name + " successfull synced.");
                def.resolve();
            }
        });
        return def.promise;
    }
    function magic(old){
        var df = Q.defer();
        console.log("magic is ok");
        setTimeout(function(){df.resolve();}, 100);
        return df.promise;
    }
    function magicSyncOne(name) { //return promice
        console.log(">>> magicSyncOne: "+name);
        var old = bdscheme[name];
        if(!old){
            return syncOne(name, scheme[name])
        }
        var def = Q.defer();
        var flagAdd = false;
        var cur = scheme[name];
        
        var stat = difference(name, scheme[name])
        var prms = def.promise,
            sch = old;
        // sync add
        if(stat.add.length != 0){
            sch = _.extend(old, _.pick(cur, stat.add));
            prms = prms.then(function(){ return syncOne(name, sch);}); 
        }
        // change
        if(stat.chng.length != 0){
           sch = _.extend(sch, _.pick(cur, stat.chng));
           flagChng = true;
        }
        //magic
         magic();
        // remove
        if(stat.rm.length != 0){
            var schR = _.omit(sch, stat.rm);
            if(_.isEqual(schR, cur)) prms = prms.then(function(){ return syncOne(name, cur);});
            else console.log(">>> Internal error: before remove schemes not equal.")
        }else save(name, cur);
        
        setTimeout(function(){def.resolve()}, 100);
        return prms;
    }
    // if(g.option('file')){
        // try {
            // var val = require(rulePath + g.option('file'));
            // if(!val) {
                // console.log(">>> No rules in file: "+g.option('file')+" Add rules and run again.");
                // return done(false);
            // }
            // rules = val;
        // } catch (err) {
            // console.log(">>>" + err);
            // return done(false);
        // }
    // }
    function done(flag){
        if(flag === false) console.log("<<< Migration module error: " + moduleErr);
        else console.log("<<< ");
    }
    return {
        __init__: function() {
            //database
            db = m.cfg.db.default;
            //config: database scheme, hash
            if(g.file.exists(cfgPath)){
               var obj = g.file.readJSON(cfgPath);
               if(obj.hash) bdhash = obj.hash;
               if(obj.scheme) bdscheme = obj.scheme;
            } else {
                moduleErr = "Config not exists.";
                return done(false);
            }
            //application scheme
            for(var i in m.app.models) {
                scheme[i] = m.app.models[i].allProperties;
            }
            return deps.database.getDatabase("default").then(function(dbs){
                db = dbs; 
                console.log(db.driver_name);
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
                    var flag = one(i);
                    if(!flag) need++; 
                }
                console.log("Need to sync: "+need+ " from "+ all+" models.");
               
            }
            if(fullLog.length != 0) console.log(fullLog);
            return done();
        },
        sync : function(modelname) {
            console.log(">>> Migration auto sync:");
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
                    return prms
                },Q());
                prms.done(function() { 
                    done();
                }, function() {
                    done(false);
                });
            }
        },
        createMagic: function(){
            // var txt = "module.exports = { /n";
//     
            // txt += "/t"+name + ":function(oldScheme){/n"+
            // +"/t};/n"
            // txt += "}"
//             
            // g.file.write(cfgPath, JSON.stringify({hash:bdhash, scheme: bdscheme}));
        },
        magicSync : function(modelname, filename){
            console.log(">>> Migration magic sync:");
            if(modelname) {
                if(scheme[modelname]) {
                    if(isSynced(modelname)){
                        console.log(">>> model " + modelname + " nothing to sync.");
                        return done();
                    }
                    // if(!rules[modelname]){
                        // console.log(">>> No rules for: " + modelname + " Add rules and run again. Or use sync:auto");
                        // return done(false);
                    // }
                    
                    var prms = magicSyncOne(modelname);
                    prms.done(done, function(){done(false);});
                }
            } else {
                //TODO
                var prms;
                _.keys(scheme).reduce(function(p,i){
                    if(!isSynced(i))
                        prms = p.then(function(){
                            return magicSyncOne(i);
                        });
                    else prms = p;
                    return prms
                },Q());
                prms.done(function() { 
                    done();
                }, function() {
                    done(false);
                });
            }
        }
    }
}


    
function createMagic(obj){
   
}
function magicSyncOne(name, rules) { //return promice
    console.log(">>> Rule sync : "+name);
    var u = m.utils._;
    var old = bdscheme[name];
    if(!old){
        return syncOne(name, scheme[name])
    }
    var def = Q.defer();
    var flagAdd = false;
    var cur = scheme[name];
    var curK = u.keys(cur);
    var oldK = u.keys(old);
    var addK = u.difference(curK, oldK);
    var remK = u.difference(oldK, curK);
    var commonK = u.difference(curK, addK);
    var changeK = u.filter(commonK, function(key){
        return !u.isEqual(cur[key],old[key]);
    })
    console.log("   Add columns: "+ addK);
    console.log("   Change columns: "+ changeK);
    console.log("   Remove columns: "+ remK);
    var prms = def.promise,
        sch = old;
    // sync add
    if(addK.length != 0){
        sch = u._.extend(old, u._.pick(cur, addK));
        flagAdd = true;
    }
    // change
    if(changeK.length != 0){
       sch = u._.extend(sch, u._.pick(cur, changeK));
       flagChng = true;
    }
    if(flagAdd) prms = prms.then(function(){ return syncOne(name, sch);});  
    //magic
    
    // remove
    if(remK.length != 0){
        var schR = u._.omit(sch, remK);
        if(u._.isEqual(schR, cur)) prms = prms.then(function(){ return syncOne(name, cur);});
        else console.log(">>> Internal error: before remove schemes not equal.")
    }else save(name, cur);
    
    setTimeout(function(){def.resolve()}, 100);
    return prms;
}







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