module.exports = function(self, deps) {
    var compareDescriptors = self.require('lib/difference');
    var getSelfScheme = self.require('lib/getScheme');
    var initState = self.require('lib/init');
    var _ = require('underscore');
    var Q = require('q');
    var dbgTab = "";
    var dbg = true;
    var fullDiff = {};
    function mydbg(val, flag){
        if (dbg && flag) return console.log(val);
        if (dbg) return console.log(dbgTab+val);
    }
    var info = function(plugin){
        if (!plugin) return Q.reject("Migration: info: error: Plugin undefined.");
        var prms = Q();
        if(_.isEmpty(plugin.cfg.name)) mydbg("Application migration information:");
        else mydbg("Plugin : "+plugin.cfg.name, true);
        
        prms = prms.then(function() {
            return initState(plugin.cfg.path);
        }).then(function(Stt) {
            return Stt.lastState(); 
        }).then(function(last) {
            var diff = compareDescriptors(last.scheme, getSelfScheme(plugin.cfg.name));
            fullDiff[plugin.cfg.name || "__app"] = diff;
            if (last.getId()){
                mydbg("Current state: " + last.getId());
                if (!last.isSynced() && last.getId())
                    mydbg("  State not complete. ");
                if (last.err)
                    mydbg("  State error: " + last.err);
            } 
            if (diff.need) {
                mydbg("  Need to sync:");
                _.each(diff.dbs, function(db){
                   mydbg("  Database: "+db);
                   if(diff.addModel[db]) mydbg("    Add models: " + JSON.stringify(diff.addModel[db]));
                   if(diff.rmModel[db]) mydbg("    Remove models: " + JSON.stringify(diff.rmModel[db]));
                   if(diff.addAttr[db]) mydbg("    Add Attributes: " + JSON.stringify(diff.addAttr[db]));
                   if(diff.rmAttr[db]) mydbg("    Remove model attributes: " + JSON.stringify(diff.rmAttr[db]));
                   if(diff.addOneA[db]) mydbg("    New model hasOne associations: " + JSON.stringify(diff.addOneA[db]));
                   if(diff.rmOneA[db]) mydbg("    Remove model hasOne associations: " + JSON.stringify(diff.rmOneA[db]));
                   if(diff.addManyA[db]) mydbg("    New model hasMany associations: " + JSON.stringify(diff.addManyA[db]));
                   if(diff.rmManyA[db]) mydbg("    Remove model hasMany associations: " + JSON.stringify(diff.rmManyA[db]));
                });
            } else {
                mydbg("  No models to sync.");
            }
            for(var db in diff.err){
                mydbg("  Errors in scheme for database: " +db);
                _.each(diff.err[db], function(item){
                    mydbg(item);
                });
            }
            if(_.keys(diff.err).length != 0 )
                mydbg("  Migration not able. Try migrate with two stages or use forced migration.");
            dbgTab = dbgTab + "    ";
            var p = Q();
            _.each(plugin.plugins, function(obj,key){
                p = p.then(function(){
                    return info(deps.plugins.getPlugin(key));
                }); 
            });
            return p.then(function(){
                return Q(fullDiff); 
            });
        });
        return prms;
    };
    
    
    return function(val){
        dbgTab = "";
        fullDiff = {};
        return info(val);
    };
};
