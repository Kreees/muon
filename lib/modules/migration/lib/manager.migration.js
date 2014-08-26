module.exports = function(self,deps){
    var preprocessProperties = self.require('lib/properties');
    var getAppScheme = self.require('lib/getAppScheme');
    var compareDescriptors = self.require('lib/difference');
    var g = require('grunt');
    var Sync = require('sql-ddl-sync').Sync;
    var Q = require('q');
    var _ = require('underscore');
    var currentState;
    var dbg = true;
    var MState;
    var flagFirst = true;
    var diff;
    var mjcDir;
    var magic = {id: null, run: null};
    
    return {
        init : function(mDir, dbPath){
           mjcDir = mDir;
           var prms = self.require('lib/migrationState').init(dbPath).then(function(State){
               MState = State;
               return State.lastState();
           }).then(function(last){
               if(last.getId()) flagFirst = false;
               currentState = last;
               if(currentState.err){
                   if(dbg) console.log(currentState.err);
                   return Q.reject(new Error("Migration module: Errors in last migration state."));
               }
               if(flagFirst) {
                   if(dbg) console.log("First migration - magic function not need.");
                   return Q();
               }
               if(currentState.isSynced()) magic.id = currentState.getId();
               else magic.id = currentState.magicId;
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
            var prms = Q();
            prms = prms.then(function(){
               if(id) return MState.getState(id);
               return MState.createState().then(function(stt){
                   var appState = stt;
                   appState.setScheme(getAppScheme());
                   return Q(appState);
               });
           }).then(function(stateTo){
               diff = compareDescriptors(currentState.scheme, stateTo.scheme);
               m.diff = diff;
               if(_.keys(diff.err).length != 0){
                   if(dbg) {
                       console.log("Migration not able. Wrong scheme changes:");
                        for(var db in diff.err){
                            console.log("Database - "+db +" :");
                            for(var i in diff.err[db]){
                                console.log(diff.err[db][i]);
                            }
                        }
                   }
                   Q.reject();
               }
               if(!diff.need){
                   if(dbg) console.log("Nothing to sync.");
                   return Q.reject("Nothing to sync.");
               }
               if(dbg){
                    console.log("Migrate -- Need to sync <--");
                    console.log("  Add models: " +JSON.stringify(diff.addModel));
                    console.log("  Add Attributes: " +JSON.stringify(diff.addModelAttributes));
                    console.log("  Remove models: " +JSON.stringify(diff.rmModel));
                    console.log("  Remove model attributes: " +JSON.stringify(diff.rmModelAttributes));
                    console.log("-->");
               }
               if(!flagFirst) {
                   magic.run = require(mjcDir+magic.id+".js");
                   if(!magic.run ){
                       if(dbg) console.log("no magic function");
                       return Q.reject(new Error("no magic function"));
                   }
               }
               if(currentState.isSynced()){
                   return MState.createState().then(function(stt){
                       syncingState = stt;
                       syncingState.setScheme(currentState.getScheme());
                       syncingState.downStateId = currentState.getId();
                   });
               } 
               syncingState = currentState;
               return Q();
           }).then(function(){ // ddl sync app models; add attributes
                if(_.keys(diff.addModelAttributes).length == 0 && _.keys(diff.addModel).length == 0) return Q();
                if(dbg) console.log("Adding models and attributes ... ");
                return syncingState.ddlSync(diff.ddlSyncAdd);
            }).then(function(){ // orm sync app models; add new models
                if(_.keys(diff.modelSync).length == 0 ) return Q();
                if(dbg) console.log("Orm syncing app models ... ");
                function one(name){
                    var df = Q.defer();
                    if(dbg) console.log(">>> syncing "+name+" ...");
                    m.app.models[name].sync(function(err){ //TODO
                        if(err) df.reject(err); 
                        else {
                            if(dbg) console.log("Model "+name+" synced.");
                            df.resolve();
                        }
                    });
                    return df.promise;
                }
                var _p = Q();
                _.each(diff.modelSync, function(dscr, db){
                    var _dsc = {};
                    _.each(dscr, function(dsc, mdl){
                        _p = _p.then(function(){
                            return one(mdl);
                        }).then(function(){
                            _dsc[mdl] = dsc;
                            return Q();
                        });
                    });
                    _p = _p.then(function(){
                        syncingState.changeDescriptor(db, _dsc);
                        return syncingState.save();
                    });
                });
                return _p;
            }).then(function(){
                return deps.plugins.reloadScope(diff.scope);
            }).then(function(){ // magic
                if(flagFirst) return Q(); 
                if(dbg) console.log("Magic ... ");
                if(magic.run) return magic.run();
                else return Q(new Error("No magic function"));
            }).then(function(){
                if(_.keys(diff.rmModelAttributes).length == 0 ){
                    if(dbg) console.log("No attributes to remove.");
                    return Q();
                }
                if(dbg) console.log("Removing models attributes ... ");
                return syncingState.ddlSync(diff.ddlSyncRm);
            }).then(function(){
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
                var diff = compareDescriptors(last.scheme, schemeTo, true);
                m.diff = diff;
                if (!diff.need) {
                    if (dbg) console.log("Nothing to sync.");
                    return Q.reject("Nothing to sync.");
                } else {
                    console.log("Need to sync <--");
                    console.log("  Add models: " + JSON.stringify(diff.addModel));
                    console.log("  Add Attributes: " + JSON.stringify(diff.addModelAttributes));
                    console.log("  Remove models: " + JSON.stringify(diff.rmModel));
                    console.log("  Remove model attributes: " + JSON.stringify(diff.rmModelAttributes));
                    console.log("-->");
                }
            });
        },

        syncScheme: function(id, force) {// force if attributes changed
            if (force) console.log("!!! ignore scheme difference !!!");
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
            }).then(function() {// orm sync app models
                if (dbg) console.log("Orm syncing ... ");
                function one(name) {
                    var df = Q.defer();
                    m.app.models[name].sync(function(err) {//TODO
                        if (err)
                            df.reject(err);
                        else {
                            if (dbg) console.log("Model " + name + " synced.");
                            df.resolve();
                        }
                    });
                    return df.promise;
                }
                var _p = Q();
                _.each(schemeTo, function(dscr, db) {
                    _.each(dscr, function(dsc, mdl) {
                        _p = _p.then(function() { return one(mdl);});
                    });
                });
                return _p;
            });
        }

    };  
};