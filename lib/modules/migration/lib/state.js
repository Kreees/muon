module.exports = function(self,deps){
    var Q = require('q');
    var orm = require('orm');
    var dbg = true;
    var State;
    return {
        __init__ : function(dbPath) {
            var dfd = Q.defer();
            orm.connect(dbPath, function(err, db){
                if (err){
                    deps.logger.exception(err);
                }
                State = db.define("state",{
                    state_id: Number,
                    scheme: Object,
                    comment: String,
                });
                State.sync(function(){
                    dfd.resolve();
                });
            });
            return dfd.promise;
        },
        lastState: function(){
            if(!State) return Q(new Error("State not init"));
            var dfd = Q.defer();
            if (dbg) console.log("Try loading last state... ");
            State.find().last(function(err, item) {
                if(err){
                    deps.logger.exception(err);
                    dfd.reject(err);
                }
                if (item && item.state_id) {
                    if (dbg) console.log("Loaded state: " + item.state_id);
                    dfd.resolve(item);
                } else {
                    if (dbg) console.log("No migration history.");
                    dfd.resolve(new State({state_id: new Date().getTime()}));
                }
            });
            return dfd.promise;
        },
        getState: function(id){
            if(!State) return Q(new Error("State not init"));
            var dfd = Q.defer();
            if (dbg) console.log("Try loading state: " + id + " ....");
            if ( typeof (id) == "number") {
                State.find({
                    state_id : id
                }, function(err, item) {
                    if (err) {
                        deps.logger.exception(err);
                        dfd.reject(err);
                    }
                    if (dbg) console.log("Loaded state: " + item.state_id + " Comment: " + item.comment);
                    dfd.resolve(item);
                });
            } else {
                if(dbg) console.log("Wrong state id: " + id);
                return Q(new Error("Wrong state id: " + id));
            }
            return dfd.promise;
        },
        difference: function(appScheme, migScheme){
            var userS = appScheme;
            var dbS = migScheme || {};
            var ormS = JSON.parse(JSON.stringify(dbS));
            var errs = [];
            var rmInfo = {};
            var addInfo = {};
            var toAdd = [];
            var flagNeed = false;
            for (var mdl in userS) {
                var userModel = userS[mdl];
                var sncModel = ormS[mdl];
                if (sncModel) {// find new models
                    for (var atr in userModel) {// find new model attributes
                        if (!sncModel[atr]) {
                            sncModel[atr] = userModel[atr];
                            if (!addInfo[mdl])
                                addInfo[mdl] = [];
                            addInfo[mdl].push(atr);
                            flagNeed = true;
                        } else {
                            if (!_.isEqual(sncModel[atr], userModel[atr])) {//model attribute was changed - error
                                errs.push("Model: " + mdl + " Attribute: " + atr + ' was changed. Migration cannot be complete.');
                            }
                        }
                    }
                    for (var atr in sncModel) {// find model attrs to remove
                        if (!userModel[atr]) {
                            if (!rmInfo[mdl])
                                rmInfo[mdl] = [];
                            rmInfo[mdl].push(atr);
                            flagNeed = true;
                        }
                    }
                } else {
                    ormS[mdl] = userModel;
                    toAdd.push(mdl);
                    flagNeed = true;
                }
            }
            var toRm = [];
            for (var mdl in ormS) {
                if (!userS[mdl]){
                    toRm.push(mdl);
                    flagNeed = true;
                }
            }
            return {
                need: flagNeed,
                ormModels : ormS,
                rmModels : toRm,
                rmModelAttr : rmInfo,
                addModelAttr : addInfo,
                addModels : toAdd,
                errs : errs,
                hasOne: false,
                hasMany: false
            };
        }        
    };
};
