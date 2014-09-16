module.exports = function(self, deps) {
    var _ = require('underscore');
    var Q = require("q");
    var Sync = require('sql-ddl-sync').Sync;
    var preprocessProperties = self.require('lib/properties');
    var dbg = true;
    
    function mydbg(val){
        if(dbg) console.log(val);
    }
    
    var ddlSyncOne = function(dbname, scheme){
        return deps.database.getDatabase(dbname).then(function(db){
            var def = Q.defer();
            if (dbg) console.log(">>>Syncing "+dbname);
            var sync = new Sync({
                dialect : db.driver_name,
                driver : db.driver,
                debug : function(text) {
                    if(dbg) console.log(">> %s", text);
                }
            });
            for (var mdl in scheme) {
                sync.defineCollection(scheme[mdl].collection, preprocessProperties(scheme[mdl].attributes));
                // console.log(mdl +" : "+_.keys(scheme[mdl].attributes));
            }
            sync.sync(function(err, obj) {
                if (err) {
                    mydbg(">>> Sync Error: " + err);
                    return def.reject(">>> Sync Error: " + err);
                } else {
                    if (err === null){ //TODO исследовать
                        mydbg(">>> Sync return null: " + obj);
                        // return def.reject(new Error(">>> Sync Error: ddl-sync problem."));
                        def.resolve();
                    }else{
                        mydbg(">>> Successfull synced.");
                        def.resolve();
                    }
                }
            });
            return def.promise;
        });
    }; 
    
    var ddlSync = function(scheme){
        var _this = this;
        var prms = Q();
        _.each(scheme, function(sch, dbname){
            prms = prms.then(function(){
                return ddlSyncOne(dbname, sch);
            }).then(function(){
                _this.changeDescriptor(dbname, sch);
                return _this.save();
            });
        });
        return prms;
    };
    
    
    return function(diff, forced) {
        if (this.isSynced()){
            return Q.reject("MigrationState: Synchronize: already synced.");
        }
        if ( typeof this.magic != "function" && !forced){
            if(!this.loadMagic()) return Q.reject("MigrationState: Synchronize: Magic function problem.");
        }
        if (!diff && !diff.schemeTo)
            return Q.reject("MigrationState: Synchronize: No object to sync with.");
        this.forced = forced;
        var _th = this;
        var prms = Q();
        prms = prms.then(function() {// ddl sync app models; add attributes
            if (forced) {
                return ddlSync.apply(_th, [schemeTo]);
            }
            if (_.keys(diff.addAttr).length == 0 && _.keys(diff.addModel).length == 0)
                return Q();
            mydbg("  DDL sync extended last scheme (adding models and attributes) ... ");
            return ddlSync.apply(_th, [diff.ddlSyncExt]);

        }).then(function() {// new app scope
            if (forced) {
                if (_.keys(diff.rmModel).length != 0)
                    return deps.plugins.reloadScope(_.extend(diff.schemeTo, diff.rmModel));
                return Q();
            }// TODO current + models to remove
            return deps.plugins.reloadScope(diff.extScope);

        }).then(function() {// orm sync //TODO each model
            // if(_.keys(diff.addManyA).length == 0 ) return Q();
            mydbg("  Orm syncing app databases ... ");
            var p = Q();
            _.each(diff.schemeTo, function(dscr, dbname) {
                p = p.then(function() {
                    return deps.database.getDatabase(dbname).then(function(db) {
                        var df = Q.defer();
                        db.sync(function(err) {
                            if (err)
                                df.reject(err);
                            else {
                                df.resolve();
                                if (dbg)
                                    console.log("    Db: " + dbname + " synced.");
                            }

                        });
                        return df.promise;
                    });
                });
            });
            return p;

        }).then(function() {// magic
            if (forced)
                return Q();
            mydbg("  Magic ... ");
            return _th.magic();
        }).then(function() {
            if (_.keys(diff.rmAttr).length == 0 || forced)
                return Q();
            mydbg("Removing models attributes ... ");
            return ddlSync.apply(_th, [diff.ddlSyncRm]);
        }).then(function() {//TODO when ready reloadScope
            if (_.keys(diff.rmModel).length == 0)
                return Q();
            mydbg("Removing models ... ");
            function one(name) {
                var df = Q.defer();
                var mdl = deps.models.getModel(name);
                if (!mdl) {
                    return Q.reject("Model " + name + " not removed. Model not defined.");
                }
                mdl.drop(function(err) {
                    if (err) {
                        df.reject(err);
                    } else {
                        mydbg("Model " + name + " removed.");
                        df.resolve();
                    }
                });
                return df.promise;
            }

            var _p = Q();
            for (var db in diff.rmModel) {
                var dscr = diff.rmModel[db];
                _.each(dscr, function(mdl) {
                    _p = _p.then(function() {
                        return one(mdl);
                    }).then(function(err) {
                        if(!err) delete dscr[mdl];
                        return Q();
                    });
                });
                _p = _p.then(function() {
                    _th.changeDescriptor(db, dscr);
                    return _th.save();
                });
            }
            return _p;
        }).then(function() {
            return _th.save(null, true);
        });
        
        prms.done(function() {
        }, function(err) {
            mydbg("Reject with: " + err);
            if (err) _th.save(err);
        });
        return prms;
        
    };
};
