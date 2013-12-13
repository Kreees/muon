var url = require("url");
var fs = require("fs");
var ObjectID = require('mongodb').ObjectID;
var mongo = require('mongodb');
var _ = require("underscore");
var Q = require("q");

m.objId = function(a){
    if (a instanceof Array) return a.map(function(a){return ObjectID(a);});
    else return ObjectID(a);
}

var dbQuerySet = function(model,data){
    this.model = model;
    this.modelName = model.modelName;
    this.__data__ = {};
    for(var i = 0, len = data.length; i < len; i++){
        this.push(data[i]._id);
        this.__data__[data[i]._id] = data[i];
    }
}

m.QuerySet = dbQuerySet;

dbQuerySet.prototype = [];
_.extend(dbQuerySet.prototype,
{
    __querySet__: true,
    del: function(){
        var _this = this;
        var dfd = Q.defer();
        this.model.db.raw.remove({_id: {$in: this.slice()}},{},function(e,_){
            if (e) dfd.reject([500,e]);
            else dfd.resolve(_this);
        });
        return dfd.promise;
    },
    count: function(){
        return this.length;
    },
    eval: function(){
        var ret = [];
        for(var i in this.slice()) ret.push(new this.model(this.__data__[this[i]]));
        return ret;
    },
    evalRaw: function(){
        var ret = [];
        for(var i in this.slice()) ret.push(this.__data__[this[i]]);
        return ret;
    }
});

var dbModelExtend = {
    get: function(id){
        var dfd = Q.defer();
        while(1){
            var _this = this;
            if (!id) {_.defer(dfd.reject,"No id specified"); break;}
            try {var id = new ObjectID(id);}
            catch(e) {_.defer(dfd.reject,[500,"Wrong ObjectId. Object doesn't exist."]); break;}
            var cursor = this.raw.find({_id: id});
            cursor.toArray(function(e,data){
                if (e) return dfd.reject(e);
                if (data.length == 0) return dfd.reject([404,"Object "+_this.model.modelName+":"+id+" doesn't exist"]);
                var obj = new _this.model(data[0]);
                obj.id = data[0]._id.toString();
                dfd.resolve(obj);
            });
            break;
        }
        return dfd.promise;
    },
    find: function(whereClause){
        var dfd = Q.defer();
        var _this = this;
        var a = this.raw.find(whereClause);
        var obj = dfd.promise;
        var stopFlag = false;
        var countCallback = function(e,len){
            if (e) dfd.reject([500, e]);
            else dfd.resolve(len);
        };
        var actions = ["sort","skip","limit","count"];
        for(var i = 0, len = actions.length; i < len; i++){
            (function(action){
                if (action == "count")
                    obj[action] = function(){
                        a = a[action].apply(a,[countCallback]);
                        for(var j = 0, jlen = actions.length; i < jlen; i++) delete obj[actions[j]];
                        stopFlag = true;
                        return obj;
                    }
                else
                    obj[action] = function(){a = a[action].apply(a,arguments); return obj;}
            })(actions[i]);
        }

        _.defer(function(){
            if (stopFlag) return;
            a.toArray(function(e,data){
                if (e || !data) dfd.reject([500,e]);
                else dfd.resolve(new dbQuerySet(_this.model,data));
            });

        });
        return obj;
    },
    sort: function(){
        var cursor = this.find({});
        return cursor.sort.apply(cursor,arguments);
    },
    limit: function(){
        var cursor = this.find({});
        return cursor.limit.apply(cursor,arguments);
    },
    skip: function(){
        var cursor = this.find({});
        return cursor.skip.apply(cursor,arguments);
    },
    count: function(whereClause){
        var dfd = Q.defer();
        this.raw.find(whereClause || {}).count(function(e,len){
            if (e) dfd.reject([500, e]);
            else dfd.resolve(len);
        });
        return dfd.promise;
    }
};

var dbObjectExtend = {
    save: function(){
        var dfd = Q.defer();
        var _this = this;
        if (!this.id) {
            this.model.db.raw.insert(this.attributes,function(e,a){
                if (e) return dfd.reject(e);
                if (!a) return dfd.reject([500,"Can't create new object of "+_this.model.modelName]);
                _this.attributes = a[0];
                _this.id = _this.attributes._id.toString();
                return dfd.resolve(_this);
            });
        }
        else {
            delete _this.attributes._id;
            this.model.db.raw.update({_id: new ObjectID(this.id)},this.attributes,{safe:true,upsert:true},function(e,a){
                if (e) return dfd.reject([500,e]);
                if (!a) return dfd.reject([404,e]);
                _this.attributes._id = new ObjectID(_this.id);
                dfd.resolve(_this);
            });
        }
        return dfd.promise;
    },
    del: function(){
        var dfd = Q.defer();
        var _this = this;
        if (this.id) {
            this.model.db.raw.remove({_id: new ObjectID(this.id)},{},function(e,_){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(_this);
            });
        }
        else _.defer(dfd.resolve,this);
        return dfd.promise;
    },
    get: function(key){
        return this.attributes[key];
    },
    set: function(key,val){
        if ('object' == typeof key){
            _.extend(this.attributes,key);
            if (this.attributes._id) this.id = this.attributes._id.toString();
        }
        else{
            this.attributes[key] = val;
            if (key == "_id") this.id = val.toString();
        }
        return this;
    }
}

module.exports = {
    extendModel: function(model){
        if ('function' != typeof model){
            throw Error("Wrong model object type: should be a function");
        }
        _.extend(model.prototype,dbObjectExtend);
        model.db = _.clone(dbModelExtend);
        var collectionName = (model.pluginName?model.pluginName.toUpperCase()+"_":"")+model.modelName.replace(/\./g,"_");
        if (!m.__databases[model.dbName])
                m.kill("Database '"+model.dbName+"' doesn't exist. Reference from '"+model.pluginName+":"+model.modelName+"' model.");
        model.db.raw = m.__databases[model.dbName].collection(collectionName);
        model.db.model = model;
    },
    init: function(){
        var dfd = Q.defer();
        m.__databaseClients = m.__databaseClients || [];
        m.__databases = [];
        while(m.__databaseClients.length != 0){
            m.__databaseClients.shift().close();
        }
        var dbNames = [];
        for(var i in m.cfg.db){
            dbNames.push(i);
            (function(dbName){
                var client = new mongo.MongoClient(new mongo.Server(m.cfg.db[dbName].host, m.cfg.db[dbName].port));
                client.open(function(e,client) {
                    if(e) m.kill(e);
                    m.__databases[dbName] = client.db(m.cfg.db[dbName].name);
                    m.__databaseClients.push(client);
                    dbNames.shift();
                    if (dbNames.length == 0) dfd.resolve();
                });
            })(i);
        }
        return dfd.promise;
    }
};