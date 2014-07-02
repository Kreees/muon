module.exports = function(self, deps) {
    var orm = require('orm');
    var cfg = deps.config.load();
    var _ = require('underscore');
    var Q = require("q");
    var Sync = require('sql-ddl-sync').Sync;
    var g = require("grunt");
    var dbg = true;
    var State;
    var currentState;
    
    function saveState(id, obj) {
        var dfd = Q.defer();
        State.find({"state_id":id}, function(err, res){
            if (err) {
                deps.logger.exception(err);
                dfd.reject(err);
            }
            if(res.length != 0) {
                res[0].scheme = obj;
                res[0].save(function(err){
                    if(err){
                        deps.logger.exception(err);
                        dfd.reject(err); 
                    }
                });
            }else {
                _db.models.state.create({
                    state_id : id,
                    scheme : obj,
                    comment : "no comment"
                }, function(err, res) {
                    if (err) {
                        deps.logger.exception(err);
                        dfd.reject(err);
                    }
                    if (dbg)
                        console.log("State saved: " + id);
                    dfd.resolve();
                });
            }
        });
        return dfd.promise;
    }
    function _sync(driver_name, driver, scheme) {
        var def = Q.defer();
        if (dbg) console.log("Synced.  ---fake---");
        return Q();
//TODO       
        var sync = new Sync({
            dialect : driver_name,
            driver : driver,
            debug : function(text) {
                if(dbg) console.log("> %s", text);
            }
        });
        for (var i in scheme) {
            sync.defineCollection(i, preprocessProperties(scheme[i]));
        }
        sync.sync(function(err) {
            if (err) {
                if(dbg) console.log(">>> Sync Error: " + err);
                return def.reject(new Error(">>> Sync Error: " + err));
            } else {
                if(dbg) console.log(">>> successfull synced.");
                def.resolve();
            }
        });
        return def.promise;
    }
    function _loadMagic(path) {
        if (!g.file.exists(path)) return false;
        // var mgc = require(path);
        // console.log(mgc);
        return function() {
            return Q();
        };
    }

    return {
        __init__ : function() {
            console.log("init");
            var dir = cfg.path + '/migrations/';
            var dbPath = cfg.path+"/migrations/history.db";
            if (!g.file.exists(dir))
                g.file.mkdir(dir);
            if (!g.file.exists(dbPath))
                g.file.write(dbPath, "");
                
            var dfd = Q.defer();
            orm.connect("sqlite://"+dbPath, function(err, db){
                if (err){
                    deps.logger.exception(err);
                } 
                State = db.define("state",{
                    state_id: Number,
                    scheme: Object,
                    comment: String,
                    // is_error: Boolean,
                    // error: String
                });
                State.sync(function(){
                    dfd.resolve();
                });
            });
            return dfd.promise;    
        },
        loadLastState : function (cb) {
            var dfd = Q.defer();
            if (dbg) console.log("Try loading last state... ");
            State.find().last(function(err, item) {
                if(err){
                    deps.logger.exception(err);
                    dfd.reject(err);
                }
                if (item && item.state_id) {
                    currentState = item;
                    if (dbg)
                        console.log("Loaded state: " + item.state_id + " Comment: " + item.comment);
                } else {
                    currentState = new State();
                    if (dbg)
                        console.log("No migration states.");
                }
                if(cb) cb(item);
                dfd.resolve();
            });
            return dfd.promise;
        },
        loadState: function(){
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
                    if (dbg)
                        console.log("Loaded state: " + item.state_id + " Comment: " + item.comment);
                    cb(item);
                    dfd.resolve();
                });
            } else {
                if(dbg) console.log("Wrong state id: " + id);
                return Q(new Error("Wrong state id: " + id));
            }
            return dfd.promise;
        },
        difference: function (flags) { //TODO извлечь информацию об отношениях
            var userS = {};
            for (var i in m.app.models) {
                userS[i] = m.app.models[i].allProperties;
            }
            var dbS = currentState.scheme || {};
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