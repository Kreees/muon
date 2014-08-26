module.exports = function(self,deps){
    var Q = require('q');
    var orm = require('orm');
    var _ = require('underscore');
    var Sync = require('sql-ddl-sync').Sync;
    var preprocessProperties = self.require('lib/properties');
    var dbg = true;
    var OrmModel = function(){};
    var compareDescriptor = self.require('lib/difference');
    
    function State(obj){
        this.scheme = {}; // db:model:descriptor
        this.downStateId = null;
        this.magicId = null;
        this.toSync = {}; // db:model
        var flagSynced = false;
        var dbModel = null;
        this.err = null;
        this.tail = null;
        this.forced = null;
        
        if(obj){
            dbModel = obj;
            this.scheme = JSON.parse(dbModel.scheme);
            this.downStateId = dbModel.downId;
            this.magicId = dbModel.magicId;
            flagSynced = dbModel.synced;
            this.err = dbModel.errors;
            this.forced = dbModel.forced;
        }
        var ddlSyncOne = function(dbname, scheme){
            return deps.database.getDatabase(dbname).then(function(db){
                var def = Q.defer();
                if (dbg) console.log(">>>Syncing "+dbname);
                var sync = new Sync({
                    dialect : db.driver_name,
                    driver : db.driver,
                    debug : function(text) {
                        if(dbg) console.log("> %s", text);
                    }
                });
                for (var mdl in scheme) {
                    sync.defineCollection(scheme[mdl].collection, preprocessProperties(scheme[mdl].attributes));
                }
                sync.sync(function(err, obj) {
                    if (err) {
                        if(dbg) console.log(">>> Sync Error: " + err);
                        return def.reject(new Error(">>> Sync Error: " + err));
                    } else {
                        if (err === null){
                        if(dbg) console.log(">>> Sync return null: " + obj);
                            // return def.reject(new Error(">>> Sync Error: ddl-sync problem."));
                            def.resolve();
                        }else{
                            if(dbg) console.log(">>> Successfull synced.");
                            def.resolve();
                        }
                        
                    }
                });
                return def.promise;
            });
        };        
        this.save = function(){
            // if (dbg) console.log("MigrationState: saving... ");
            var dfd = Q.defer();
            if(!dbModel){
                if(!this.err) this.flagSynced = true;
                dbModel = new OrmModel({
                    state_id: new Date().getTime(),
                    scheme: JSON.stringify(this.scheme),
                    synced: this.flagSynced,
                    errors: this.err,
                    downId: this.downStateId,
                    magicId: this.magicId,
                    forced: this.forced
                });
                
            } else {
                if(!this.err) this.flagSynced = true;
                dbModel.scheme = JSON.stringify(this.scheme);
                dbModel.synced = this.flagSynced;
                dbModel.errors = this.err;
                dbModel.forced = this.forced;
            }
            var _this = this;
            dbModel.save(function(err){
               if(err) {
                   if (dbg) console.log("MigrationState: Save error: " +err);
                   return dfd.reject(err);
               } else {
                   if (dbg){
                       console.log("MigrationState: saved "+ dbModel.state_id);
                       for(var i in this.scheme){
                           console.log(">>> "+i+" --- " +_.keys(this.scheme[i]));
                       }
                   } 
                   dfd.resolve();
               }
            });
            
            return dfd.promise;
        };
        this.ddlSync = function(scheme){
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
        
        this.changeDescriptor = function(db, desc){
            if(!db) return;
            if(!this.scheme[db]) this.scheme[db] = {};
            var sch = this.scheme[db];
            for(var mdl in desc){
                sch[mdl] = desc[mdl];
            }
            this.scheme[db] = sch;
        };
        this.setScheme = function(obj){
            for(var db in obj){
                this.changeDescriptor(db, obj[db]);
            }  
        };
        this.isSynced = function(){
            if(flagSynced) return true;
            return false;
        };
        this.getScheme = function(){
            return JSON.parse(JSON.stringify(this.scheme));
        };
        this.getId = function(){
            if(dbModel) return dbModel.state_id;
            return null;
        };
    };
    State.newMagicId = function(){
        return State.lastState().then(function(stt){
            if(!stt) return Q(false);
            return stt.getId();
        });
    };
    State.lastState = function(){
        var dfd = Q.defer();
        // if (dbg) console.log("Try loading last state... ");
        OrmModel.find().last(function(err, item) {
            if(err){
                deps.logger.exception(err);
                return dfd.reject(err);
            }
            if (item && item.state_id) {
                if (dbg) console.log("Loaded state: " + item.state_id);
                dfd.resolve(new State(item));
            } else {
                if (dbg) console.log("No migration history.");
                dfd.resolve(new State());
            }
        });
        return dfd.promise;
    };
    
    State.getState = function(id){
        var dfd = Q.defer();
        if (dbg) console.log("Try loading state: " + id + " ....");
        OrmModel.find({
            state_id : id
        }, function(err, items) {
            if (err) {
                deps.logger.exception(err);
                return dfd.reject(err);
            }
            var item = items[0];
            if (item && item.state_id) {
                if (dbg) console.log("Loaded state: " + item.state_id);
                dfd.resolve(new State(item));
            } else {
                if (dbg) console.log("No MigrationState with id: " + id);
                dfd.reject();
            }
        });
        return dfd.promise;
    };
    
    State.createState = function(){
        return Q(new State());
    };
        
        
    return {
        init: function(dbPath) {
            console.log("init State");
            
            var dfd = Q.defer();
            orm.connect(dbPath, function(err, db){
                if (err){
                    deps.logger.exception(err);
                }
                OrmModel = db.define("state",{
                    state_id: Number,
                    scheme: String,
                    synced: Boolean,
                    errors: String,
                    downId: Number,
                    magicId: Number,
                    forced: Boolean
                });
                OrmModel.sync(function(err){
                    if(err) dfd.reject(new Error(err));
                    dfd.resolve(State);
                });
            });
            return dfd.promise;
        }
        
    };
};