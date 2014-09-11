module.exports = function(self, deps) {
    var compareDescriptors = self.require('lib/difference');
    var getAppScheme = self.require('lib/getAppScheme');
    var _ = require('underscore');
    var Q = require('q');
    var mydbg = true;
    
    return function(id, dbg) {
        if(!self.MState) return Q.reject("Module error: Undefined migration.MState");
        var schemeTo;
        var prms = Q();
        if (dbg == undefined) dbg = true;
        if (dbg)
            console.log("---Information:");
        if ( typeof id === 'number') {
            prms = self.MState.getState(id).then(function(state) {// if no state - reject
                schemeTo = state.scheme;
                if (dbg)
                    console.log("Migrate to state:" + id);
            });
        } else {
            if (dbg)
                console.log("Migrate to application scheme.");
            schemeTo = getAppScheme();
        }
        prms = prms.then(function() {
            return self.MState.lastState();
        }).then(function(last) {
            var diff = compareDescriptors(last.scheme, schemeTo);
            m.diff = diff;
            if (dbg) {
                if (!last.getId())
                    console.log("The first migration.");
                else{
                    console.log("Current migration state id: " + last.getId());
                    if (!last.isSynced() && last.getId())
                        console.log("  State not complete. ");
                    if (last.err)
                        console.log("  State error: " + last.err);
                } 
                if (diff.need) {
                    console.log("Need to sync:");
                    _.each(diff.dbs, function(db){
                       console.log("  Database: "+db);
                       if(diff.addModel[db]) console.log("    Add models: " + JSON.stringify(diff.addModel[db]));
                       if(rmModel[db]) console.log("    Remove models: " + JSON.stringify(diff.rmModel[db]));
                       if(diff.addAttr[db]) console.log("    Add Attributes: " + JSON.stringify(diff.addAttr[db]));
                       if(diff.rmAttr[db]) console.log("    Remove model attributes: " + JSON.stringify(diff.rmAttr[db]));
                       if(diff.addOneA[db]) console.log("    New model hasOne associations: " + JSON.stringify(diff.addOneA[db]));
                       if(diff.rmOneA[db]) console.log("    Remove model hasOne associations: " + JSON.stringify(diff.rmOneA[db]));
                       if(diff.addManyA[db]) console.log("    New model hasMany associations: " + JSON.stringify(diff.addManyA[db]));
                       if(diff.rmManyA[db]) console.log("    Remove model hasMany associations: " + JSON.stringify(diff.rmManyA[db]));
                    });
                } else {
                    console.log(" Nothing to sync.");
                }
                for(var db in diff.err){
                    console.log("Errors in scheme for database: " +db);
                    _.each(diff.err[db], function(item){
                        console.log(item);
                    });
                }
                if(_.keys(diff.err).length != 0 )
                    console.log("Migration not able. Try migrate with two stages or use force (data may be lost).");
                console.log("-----------------");
            }
            return Q.resolve(diff);
        });
        return prms;
    };
};
