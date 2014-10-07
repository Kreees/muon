module.exports = function(self, deps) {
    var compareDescriptors = self.require('lib/difference');
    var getSelfScheme = self.require('lib/getScheme');
    var initState = self.require('lib/init');
    var _ = require('underscore');
    var Q = require('q');
    var dbgTab = "";
    var dbg = true;
    var fullDiff = {};
    function mydbg(val){
        if (dbg) return console.log(dbgTab+val);
    }
    function migrate(plugin, forced){
        var prms = Q();
        var prms = prms.then(function() {
            return initState(plugin.cfg.path);
        }).then(function(Stt) {
            return Stt.lastState().then(function(last) {
                if (!last.isSynced() && last.getId()) {
                    mydbg("  Will continue the last migration state.");
                    return Q(last);
                }
                return Stt.createState().then(function(stt) {
                    stt.setScheme(last.getScheme());
                    if (last.getId())
                        stt.downStateId = last.getId();
                    return Q(stt);
                });
            });
//models                
        }).then(function(syncingS){
            var diff = compareDescriptors(syncingS.scheme, getSelfScheme(plugin.cfg.name));
            if(_.keys(diff.err).length != 0 && !forced){
                for(var db in diff.err){
                    mydbg("  Errors in scheme for database: " +db);
                    _.each(diff.err[db], function(item){
                        mydbg(item);
                    });
                }
                mydbg("  Migration not able. Try migrate with two stages or use forced migration.");
            }
            if(forced) return syncingS.synchronize(diff, forced);
            if (!diff.need) {
                mydbg("  No models to sync.");
                return Q();
            }
            return syncingS.synchronize(diff);
        }).then(function(){
            dbgTab = dbgTab + "    ";
            var p = Q();
            _.each(plugin.plugins, function(obj,key){
                p = p.then(function(){
                    return migrate(deps.plugins.getPlugin(key), forced);
                }); 
            });
            return p.then(function(){
                Q.resolve(fullDiff); 
            });
        });
        return prms;
    }
    
    return function(val, flag){
        dbgTab = "";
        fullDiff = {};
        return migrate(val, flag);
    };
};
