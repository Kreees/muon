module.exports = function(self,deps){
    var preprocessProperties = self.require('lib/properties');
    var getAppScheme = self.require('lib/getAppScheme');
    var compareDescriptors = self.require('lib/difference');
    var g = require('grunt');
    var Sync = require('sql-ddl-sync').Sync;
    var Q = require('q');
    var _ = require('underscore');
    var currentState;
    var appState;
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
               return Q();
           }).then(function(){
               return MState.createState().then(function(stt){
                   appState = stt;
                   appState.setScheme(getAppScheme());
               });
           }).then(function(){
               diff = compareDescriptors(currentState.scheme, appState.scheme);
               m.diff = diff;
               if(diff.need){
                   if(flagFirst) {
                       if(dbg) console.log("First migration - magic function not need.");
                       return Q();
                   }
                   if(!currentState.isSynced()){
                       magic.id = currentState.magicId;
                   } else {
                       magic.id = currentState.getId();
                   }
                   
                   var mjcPath = mjcDir+magic.id+".js";
                   var txt = "module.exports = {\n"+
                   "function(models) {\n"+
                   "}\n"+
                   "};\n";
                   if (!g.file.exists(mjcPath)){
                       g.file.write(mjcPath, txt);
                       if(dbg) console.log("Magic file created: "+ mjcPath);
                   } else {
                       if(dbg) console.log("Magic file already exists: " + mjcPath);
                   }
                   magic.run = require(mjcPath);
                        
               } else {
                   if(dbg) console.log("Nothing to sync.");
                   return Q(new Error("Nothing to sync."));
               }
               return Q();
           });
           return prms;
        }, 
        run: function(){
            if(!diff.need){
                if(dbg) console.log("Nothing to sync");
                return Q();
            }
            if(!flagFirst && !magic.run ){
                if(dbg) console.log("no magic function");
                return Q().reject(new Error("no magic function"));
            }
            var prms = Q();
            var syncingState;
            if(currentState.isSynced()){
                prms = MState.createState().then(function(stt){
                    syncingState = stt;
                    syncingState.setScheme(currentState.getScheme());
                    syncingState.downStateId = currentState.getId();
                });
            } else {
                syncingState = currentState;
            }
            
            prms = prms.then(function(){ // ddl sync app models;
                if(dbg) console.log("ddl sync added app models ... ");
                if(_.keys(diff.ddlSyncAdd).length == 0 ){
                    if(dbg) console.log("no models to ddl-sync.");
                    return Q();
                } 
                return syncingState.ddlSync(diff.ddlSyncAdd).then(function(){
                    return deps.config.reloadScope();
                });
            }).then(function(){ // orm sync app models;
                if(dbg) console.log("orm sync app models ... ");
                if(_.keys(diff.modelSync).length == 0 ) {
                    if(dbg) console.log("no models to sync.");
                    return Q();
                }
                function one(name){
                    var df = Q.defer();
                    m.app.models[mdl].sync(function(err){ //TODO
                        if(err) df.reject(err);
                        if(dbg) console.log("Model "+mdl+" synced.");
                        df.resolve();
                    });
                    return df.promise;
                }
                var _p = Q();
                for (var db in diff.modelSync){
                    var dsc = diff.modelSync[db];
                    for(var mdl in dsc){
                        _p = _p.then(function(){
                            return one(mdl);
                        }).then(function(){
                            var _dsc = {};
                            _dsc[mdl] = dsc[mdl];
                            syncingState.changeDescriptor(db, _dsc);
                            return Q();
                        });
                    }
                    _p = _p.then(function(){
                        return syncingState.save();
                    });
                }
                return _p;
            }).then(function(){ // magic
                if(flagFirst) return Q(); 
                if(dbg) console.log("Magic ... ");
                if(magic.run) return magic.run();
                else return Q(new Error("No magic function"));
            }).then(function(){
                if(dbg) console.log("ddl sync removed app models ... ");
                if(_.keys(diff.ddlSyncRm).length == 0){
                    if(dbg) console.log("no models to remove.");
                    return Q();
                } 
                return syncingState.ddlSync(diff.ddlSyncRm);
            });
            return prms;
        }
    };  
};