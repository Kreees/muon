var url = require("url");
var fs = require("fs");
var ObjectID = require('mongodb').ObjectID;
var mongo = require('mongodb');
var _ = require("underscore");
var Q = require("q");

var db = null;
m.objId = function(a){
    if (a instanceof Array) return a.map(function(a){return ObjectID(a);});
    else return ObjectID(a);
}

function $(obj){
    if (!obj.model.__collection){
        var collectionName = (obj.model.pluginName?obj.model.pluginName.toUpperCase()+"_":"")+obj.model.modelName.replace(/\./g,"_");
        obj.model.__collection = m.db.collection(collectionName);
    }
    return obj.model.__collection;
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
        $(this).remove({_id: {$in: this.slice()}},{},function(e,_){
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
            var cursor = $(this).find({_id: id});
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
        var a = $(this).find(whereClause);
        var obj = dfd.promise;
        var stopFlag = false;
        var countCallback = function(e,len){
            if (e) dfd.reject([500, e]);
            else dfd.resolve(len);
        };
        var actions = ["sort","count","skip","limit"];
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
    count: function(whereClause){
        var dfd = Q.defer();
        $(this).find(whereClause || {}).count(function(e,len){
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
            $(this).insert(this.attributes,function(e,a){
                if (e) return dfd.reject(e);
                if (!a) return dfd.reject([500,"Can't create new object of "+_this.model.modelName]);
                _this.attributes = a[0];
                _this.id = _this.attributes._id.toString();
                return dfd.resolve(_this);
            });
        }
        else {
            delete _this.attributes._id;
            $(this).update({_id: new ObjectID(this.id)},this.attributes,{safe:true,upsert:true},function(e,a){
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
            $(this).remove({_id: new ObjectID(this.id)},{},function(e,_){
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
    extend: function(model){
        if ('function' != typeof model){
            throw Error("Wrong model object type: should be a function");
        }
        _.extend(model.prototype,dbObjectExtend);
        model.db = _.clone(dbModelExtend);
        model.db.model = model;
    },
    init: function(dbName){
        var dfd = Q.defer();
        if (global.m.db){
            db = global.m.db;
            _.defer(dfd.resolve);
        }
        else {
            mongo.MongoClient.connect(dbName, function(err, dbObj) {
                if(err) throw err;
                global.m.db = dbObj;
                db = dbObj;
                dfd.resolve();
            });
        }
        return dfd.promise;
    }
};