module.exports = function(self,deps){
    var Sync = require('sql-ddl-sync').Sync;
    var states = self.require('lib/state');
    var diff;
    var currentState;
    var dbg = true;
    var Q = require('q');
    
    var sync = function(driver_name, driver, scheme){
        var def = Q.defer();
        if (dbg) console.log("Syncing ");
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
    };
    var beforeMagic = function(scheme){
        console.log("Before magic");
        dbSchemas = {};
        
        for(var mdl in scheme){
            var dsc = deps.models.getDescriptor(mdl);
            if (!dbSchemas[dsc.db]) dbSchemas[dsc.db] = {}; 
            dbSchemas[dsc.db][mdl] = scheme[mdl];
        }
        for(var db in dbSchemas){
            return deps.database.getDatabase(dsc.db).then(function(db){
                console.log(db.driver_name);
                // console.log(db.driver);
                return sync(db.driver_name, db.driver, dbSchemas[db]);
            }).then(function(){
                var dfd = Q.defer();
                currentState.scheme = JSON.stringify(dbSchemas[db]);
                console.log(currentState.scheme);
                currentState.save(function(err){
                    if(err) deps.logger.exeption(err);
                    if(dbg) console.log("State saved");
                    dfd.resolve();
                });
                return dfd.promise;
            });
        }
    }; 
    var afterMagic = function(){
        return Q();
    };
    var magic = function(){
        return Q();
    };
    
    return {
        __init__ : function(dbPath){
           return states.__init__(dbPath);
        }, 
        process: function(){
            var prms = states.lastState()
            .then(function(stt){
                currentState = stt;
                var appS = [];
                for (var i in m.app.models) {
                    appS[i] = m.app.models[i].allProperties;
                }
                var diff = states.difference(appS, stt.scheme);
                if(diff.need){
                    return beforeMagic(diff.ormModels);
                } else {
                    if(dbg) console.log("Nothing to sync.");
                    process.exit();
                }               
            }).then(function() { // reload scope
                return deps.plugins.reloadScope(diff);
            }).then(function() {//magic
                return magic();                    
            }).then(function() { //Удаляет таблицы и колонки 
                return afterMagic();
            });

            prms.done(function() {
                m.emit("migrate-ready");
                process.exit();
            }, function() {

            });
            return prms;
        },
        up: function(){
            
        },
        down: function(){
            
        }
    };  
};