module.exports = function(self,deps){
    var getAppScheme = self.require('lib/getAppScheme');
    var compareDescriptors = self.require('lib/difference');
    var g = require('grunt');
    var Q = require('q');
    var _ = require('underscore');
    var dbg = true;
    var MState;
    var flagFirst = true;
    var mjcDir;
    var magic = {id: null, run: null};
    
    return {
        init : function(mDir, dbPath){
           mjcDir = mDir;
           var prms = self.require('lib/migrationState').init(dbPath).then(function(State){
               MState = State;
               return MState.lastState();
           }).then(function(last){
               if(last.getId()) flagFirst = false;
               if(last.err){
                   if(dbg) console.log(last.err);
                   return Q.reject(new Error("Migration module: Errors in last migration state."));
               }
               if(flagFirst) {
                   if(dbg) console.log("First migration - magic function not need.");
                   return Q();
               }
               if(last.isSynced()) magic.id = last.getId();
               else magic.id = last.magicId;
               var mjcPath = mjcDir+magic.id+".js";
               var txt = "module.exports = function(){\n"+
               "return function(models) {\n"+
               "}\n"+
               "};\n";
               if (!g.file.exists(mjcPath)){
                   g.file.write(mjcPath, txt);
                   if(dbg) console.log("Magic file created: "+ mjcPath);
               } else {
                   if(dbg) console.log("Magic file already exists: " + mjcPath);
               }
               return Q();
           });
           return prms;
        }, 
        run: function(id){
            var diff;
            var syncingState;
            var currentState;
            var schemeTo;
            var prms = Q();
            if(typeof id === 'number')
                prms = MState.getState(id).then(function(state){
                    schemeTo = state.scheme;
                    return Q();
                });
            else schemeTo = getAppScheme();
            prms = prms.then(function(){
                return MState.lastState();
            }).then(function(last) {
                currentState = last;
                if (last.err) {
                    if (dbg) console.log("Last migration has an error: " + last.err);
                    return Q.reject();
                }
               diff = compareDescriptors(currentState.scheme, schemeTo);
               m.diff = diff;
               if(!diff.need){
                   if(dbg) console.log("Nothing to sync.");
                   return Q.reject("Nothing to sync.");
               }
               if(_.keys(diff.err).length != 0){
                   if(dbg) {
                       console.log("Migration not able. Scheme changes:");
                        for(var db in diff.err){
                            console.log("Database - "+db +" :");
                            for(var i in diff.err[db]){
                                console.log(diff.err[db][i]);
                            }
                        }
                   }
                   Q.reject("Migration not able.");
               }
               if(!flagFirst) {
                   magic.run = require(mjcDir+magic.id+".js");
                   if(!magic.run ){
                       if(dbg) console.log("No magic function");
                       return Q.reject(new Error("no magic function"));
                   }
               }
               
               
               if(currentState.isSynced()) return Q(currentState);
               else return MState.createState();
               
           }).then(function(stt){ // ddl sync app models; add attributes
               syncingState = stt;
               syncingState.setScheme(currentState.getScheme());
               syncingState.downStateId = currentState.getId();
               
                if(_.keys(diff.addAttr).length == 0 && _.keys(diff.addModel).length == 0) return Q();
                if(dbg) console.log("ddl sync extended last scheme (adding models and attributes) ... ");
                return syncingState.ddlSync(diff.ddlSyncExt);
                
            }).then(function(){ // new app scope
                return deps.plugins.reloadScope(diff.extScope);  
                  
            }).then(function(){ // orm sync 
                // if(_.keys(diff.addManyA).length == 0 ) return Q();
                if(dbg) console.log("Orm syncing app databases ... ");
                var p = Q();
                _.each(schemeTo, function(dscr, dbname) {
                    p = p.then(function(){
                        deps.database.getDatabase(dbname).then(function(db){
                            var df = Q.defer();
                            db.sync(function(err){
                                if(err) df.reject(err);
                                else{
                                    df.resolve();
                                    if(dbg) console.log("Db: "+dbname+" synced.");
                                } 
                                
                            });
                            return df.promise;
                     });
                    });
                });
                return p;
                
            }).then(function(){ // magic
                if(flagFirst) return Q(); 
                if(dbg) console.log("Magic ... ");
                if(magic.run) return magic.run();
                else return Q(new Error("No magic function"));
                
            }).then(function(){
                if(_.keys(diff.rmAttr).length == 0 ) return Q();
                if(dbg) console.log("Removing models attributes ... ");
                return syncingState.ddlSync(diff.ddlSyncRm);
                
            }).then(function(){//TODO when ready reloadScope
                return Q();
                if(_.keys(diff.rmModel).length == 0 ) return Q();
                if(dbg) console.log("Removing models ... ");
                function one(name){
                    var df = Q.defer();
                    m.app.models[name].drop(function(err){
                        if(err) df.reject(err); 
                        else {
                            if(dbg) console.log("Model "+name+" removed.");
                            df.resolve();
                        }
                    });
                    return df.promise;
                }
                var _p = Q();
                for (var db in diff.rmModel){
                    var dscr = diff.rmModel[db];
                    _.each(dscr, function(dsc, mdl){
                        _p = _p.then(function(){
                            return one(mdl);
                        }).then(function(){
                            delete dscr[mdl];
                            return Q();
                        });
                    });
                    _p = _p.then(function(){
                        syncingState.changeDescriptor(db, dscr);
                        return syncingState.save();
                    });
                }
                return _p;    
            });
            return prms;
        },

        info: function(id) {
            var schemeTo = getAppScheme();
            var prms = Q();
            if ( typeof id === 'number') {
                prms = MState.getState(id).then(function(state) {
                    schemeTo = state.scheme;
                });
            } else
                schemeTo = getAppScheme();
            prms = prms.then(function(){
                return MState.lastState();
            }).then(function(last) {
                if (last.err) {
                    if (dbg) console.log("Last migration has an error: " + last.err);
                }
                var diff = compareDescriptors(last.scheme, schemeTo);
                m.diff = diff;
                if (!diff.need) {
                    if (dbg) console.log("Nothing to sync.");
                    return Q.reject("Nothing to sync.");
                } else {
                    console.log("Need to sync <--");
                    console.log("  Errors: "+JSON.stringify(diff.err));
                    console.log("  Add models: " +JSON.stringify(diff.addModel));
                    console.log("  Remove models: " +JSON.stringify(diff.rmModel));
                    console.log("  Add Attributes: " +JSON.stringify(diff.addAttr));
                    console.log("  Remove model attributes: " +JSON.stringify(diff.rmAttr));
                    console.log("  New model hasOne associations: " +JSON.stringify(diff.addOneA));
                    console.log("  Remove model hasOne associations: " +JSON.stringify(diff.rmOneA));
                    console.log("  New model hasMany associations: " +JSON.stringify(diff.addManyA));
                    console.log("  Remove model hasMany associations: " +JSON.stringify(diff.rmManyA));
                    console.log("  Changes: " +JSON.stringify(diff.changes));
                    console.log("-->");
                }
            });
        },

        syncScheme: function(id, force) {// force if attributes changed
            if (force) console.log("!!! Ignore scheme difference !!!");
            var syncingState;
            var currentState;
            var schemeTo;
            var prms = Q();
            if(typeof id === 'number')
                prms = MState.getState(id).then(function(state){
                    schemeTo = state.scheme;
                    return Q();
                });
            else schemeTo = getAppScheme();
            prms = prms.then(function(){
                return MState.lastState();
            }).then(function(last) {
                currentState = last;
                if (last.err) {
                    if (dbg) console.log("Last migration has an error: " + last.err);
                }
                var diff = compareDescriptors(currentState.scheme, schemeTo, true);
                m.diff = diff;
                if (!diff.need && !force) {
                    if (dbg) console.log("Nothing to sync.");
                    return Q.reject("Nothing to sync.");
                }
                return MState.createState();
            }).then(function(stt) {// ddl sync app models
                syncingState = stt;
                syncingState.setScheme(schemeTo);
                syncingState.downStateId = currentState.getId();
                syncingState.forced = true;
                if (dbg) console.log("DDL syncing ... ");
                return syncingState.ddlSync(schemeTo);

            }).then(function(){ // orm sync databases (all models at once)
                var p = Q();
                _.each(schemeTo, function(dscr, dbname) {
                    p = p.then(function(){
                        deps.database.getDatabase(dbname).then(function(db){
                            var df = Q.defer();
                            db.sync(function(err){
                                if(err) df.reject(err);
                                else{
                                    df.resolve();
                                    if(dbg) console.log("Db: "+dbname+" synced.");
                                } 
                                
                            });
                            return df.promise;
                     });
                    });
                });
                return p;
                 
            });
            return prms;
        }

    };  
};