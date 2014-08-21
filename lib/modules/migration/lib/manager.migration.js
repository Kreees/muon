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
                   appState = stt;
                   appState.setScheme(getAppScheme());
                   return Q(appState);
               });
           }).then(function(stateTo){
               diff = compareDescriptors(currentState.scheme, stateTo.scheme);
               m.diff = diff;
               if(!diff.need){
                   if(dbg) console.log("Nothing to sync.");
                   return Q.reject("Nothing to sync.");
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
                if(dbg) console.log("ddl sync adding app models ... ");
                if(_.keys(diff.ddlSyncAdd).length == 0 ){
                    if(dbg) console.log("no models to ddl-sync.");
                    return Q();
                } 
                return syncingState.ddlSync(diff.ddlSyncAdd).then(function(){
                    return deps.plugins.reloadScope();
                });
            }).then(function(){ // orm sync app models; add new models
                if(dbg) console.log("orm syncing app models ... ");
                if(_.keys(diff.modelSync).length == 0 ) {
                    if(dbg) console.log("no models to sync.");
                    return Q();
                }
                function one(name){
                    var df = Q.defer();
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
                for (var db in diff.modelSync){
                    var dscr = diff.modelSync[db];
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
                }
                return _p;
            }).then(function(){ // magic
                if(flagFirst) return Q(); 
                if(dbg) console.log("Magic ... ");
                if(magic.run) return magic.run();
                else return Q(new Error("No magic function"));
            }).then(function(){
                if(dbg) console.log("ddl sync removing app models ... ");
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