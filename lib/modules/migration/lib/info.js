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
                    console.log("  Migrate to state with id = " + id);
            });
        } else {
            if (dbg)
                console.log("  Migrate to application scheme.");
            schemeTo = getAppScheme();
        }
        prms = prms.then(function() {
            return self.MState.lastState();
        }).then(function(last) {
            var diff = compareDescriptors(last.scheme, schemeTo);
            m.diff = diff;
            if (dbg) {
                if (last.err)
                    console.log("  Last migration state has an error: " + last.err);
                if (!last.isSynced() && last.getId())
                    console.log("  Last migration state not complete. ");
                if (!last.getId())
                    console.log("  The First migration.");
                if (diff.need) {//TODO beautifully log for each db
                    console.log("  Compare Errors: " + JSON.stringify(diff.err));
                    console.log("  Add models: " + JSON.stringify(diff.addModel));
                    console.log("  Remove models: " + JSON.stringify(diff.rmModel));
                    console.log("  Add Attributes: " + JSON.stringify(diff.addAttr));
                    console.log("  Remove model attributes: " + JSON.stringify(diff.rmAttr));
                    console.log("  New model hasOne associations: " + JSON.stringify(diff.addOneA));
                    console.log("  Remove model hasOne associations: " + JSON.stringify(diff.rmOneA));
                    console.log("  New model hasMany associations: " + JSON.stringify(diff.addManyA));
                    console.log("  Remove model hasMany associations: " + JSON.stringify(diff.rmManyA));
                    console.log("  Changes: " + JSON.stringify(diff.changes));
                } else {
                    console.log(" Nothing to sync.");
                }
                console.log("-----------------");
            }
            return Q.resolve(diff);
        });
        return prms;
    };
};
