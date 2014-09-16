module.exports = function(self,deps){
    var Q = require('q');
    var orm = require('orm');
    var _ = require('underscore');
    var g = require('grunt');
    var dbg = true;
    var OrmModel = function(){};
    
    
    function mydbg(obj, flag){
        if(dbg || flag) console.log(obj);
    }
    
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
        this.myname = "";
        this.magic = null;
        
        if(obj){
            dbModel = obj;
            this.scheme = JSON.parse(dbModel.scheme);
            this.downStateId = dbModel.downId;
            this.magicId = dbModel.magicId;
            flagSynced = dbModel.synced;
            this.err = dbModel.errors;
            this.forced = dbModel.forced;
        }
               
        this.save = function(err, flag){
            // if (dbg) console.log("MigrationState: saving... ");
            var dfd = Q.defer();
            flagSynced = flag;
            if(err){
                this.err = err;
                flagSynced = false;
            } 
            if(!dbModel){
                dbModel = new OrmModel({
                    state_id: new Date().getTime(),
                    scheme: JSON.stringify(this.scheme),
                    synced: flagSynced,
                    errors: this.err,
                    downId: this.downStateId,
                    magicId: this.magicId,
                    forced: this.forced
                });
            } else {
                dbModel.scheme = JSON.stringify(this.scheme);
                dbModel.synced = flagSynced;
                dbModel.errors = this.err;
                dbModel.forced = this.forced;
                dbModel.downId = this.downStateId;
                dbModel.magicId = this.magicId;
            }
            var _this = this;
            dbModel.save(function(err){
               if(err) {
                   mydbg("MigrationState: Save error: " +err);
                   return dfd.reject(err);
               } else {
                   mydbg("MigrationState: saved "+ dbModel.state_id);
                   mydbg(JSON.stringify(_this.scheme));
                   dfd.resolve();
               }
            });
            
            return dfd.promise;
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
        this.synchronize = self.require("lib/sync");
        this.loadMagic = function(path) {
            var mjcPath;  
            if(path) mjcPath = path; //TODO how to save magic Id
            else{
                if(this.downStateId)
                    mjcPath = this.mjcDir + this.downStateId + ".js";
                else{
                    this.magic = function(){};
                    mydbg("  First migration - magic not need.");
                    return true;
                } 
            } 
            var txt = "module.exports = function(){\n" + "return function(models) {\n" + "}\n" + "};\n";
            if (!g.file.exists(mjcPath)) {
                g.file.write(mjcPath, txt);
                mydbg("  Magic file created: " + mjcPath +"  Complete file and run migration.", true);
                return false;
            } else {
                this.magic = require(mjcPath);
                if ( typeof this.magic === "function") {
                    return true;
                } else {
                    mydbg("  Magic is not a function. File path: " + mjcPath + "  Complete file and run migration again.", true);
                    return false;
                }
            }
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
                deps.logger.exception(new Error(err));
                return dfd.reject(err);
            }
            if (item && item.state_id) {
                mydbg("Loaded state: " + item.state_id);
                dfd.resolve(new State(item));
            } else {
                mydbg("No migration history.");
                dfd.resolve(new State());
            }
        });
        return dfd.promise;
    };
    
    State.getState = function(id){
        var dfd = Q.defer();
        mydbg("Try loading state: " + id + " ....");
        OrmModel.find({
            state_id : id
        }, function(err, items) {
            if (err) {
                deps.logger.exception(new Error(err));
                return dfd.reject(err);
            }
            var item = items[0];
            if (item && item.state_id) {
                mydbg("Loaded state: " + item.state_id);
                dfd.resolve(new State(item));
            } else {
                dfd.reject("No MigrationState with id: " + id);
            }
        });
        return dfd.promise;
    };
    
    State.createState = function(){
        return Q(new State());
    };
        
        
    return {
        init: function(dbPath, mjcDir) {
            if(mjcDir) 
                State.prototype.mjcDir = mjcDir;
            var dfd = Q.defer();
            orm.connect(dbPath, function(err, db){
                if (err)
                    deps.logger.exception(new Error(err));
                OrmModel = db.define("state",{
                    state_id: Number,
                    scheme: String,
                    synced: Boolean,
                    errors: String,
                    downId: Number,
                    magicId: Number,
                    forced: Boolean,
                    plugins: String
                });
                OrmModel.sync(function(err){
                    if(err) 
                        deps.logger.exception(new Error(err));
                    dfd.resolve(State);
                });
            });
            return dfd.promise;
        }
        
    };
};