module.exports = function(self,deps){
    var getAppScheme = self.require('lib/getAppScheme');
    var compareDescriptors = self.require('lib/difference');
    var dbg = true;
    var currentState;
    var appState;
    var MigrationState;
    return {
        init : function(mjcPath, dbPath){
           var prms = self.require('lib/migrationState').init(dbPath).then(function(State){
               MigrationState = State;
               return MigrationState.lastState();
           }).then(function(last){
               currentState = last;
               if(currentState.err){
                   if(dbg) console.log(currentState.err);
                   return Q.reject(new Error("Migration module: Errors in last migration state."));
               }
               return Q();
           }).then(function(){
               return MigrationState.createState().then(function(stt){
                   appState = stt;
                   appState.setScheme(getAppScheme());
               });
           }).then(function(){
               var diff = compareDescriptors(currentState.scheme, appState.scheme);
               m.diff = diff;
               if(diff.need){
                   if(dbg){
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
               } else {
                   if(dbg) console.log("Nothing to sync.");
               }
               return Q();
           });
           return prms;
        }        
    };  
};
