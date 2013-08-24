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
        var collection_name = (obj.model.plugin_name?obj.model.plugin_name.toUpperCase()+"_":"")+obj.model.model_name.replace(/\./g,"_");
        obj.model.__collection = m.db.collection(collection_name);
    }
    return obj.model.__collection;
}

var db_queryset = function(model,data){
    this.model = model;
    this.model_name = model.model_name;
    this.__data__ = {};
    for(var i in data){
        this.push(data[i]._id);
        this.__data__[data[i]._id] = data[i];
    }
}

m.QuerySet = db_queryset;

db_queryset.prototype = [];
_.extend(db_queryset.prototype,
{
    del: function(){
        var _this = this;
        var dfd = Q.defer();
        $(this).remove({_id: {$in: this.slice()}},{},function(e,_){
            if (e) dfd.reject(e);
            else dfd.resolve(_this);
        });
        return dfd.promise;
    },
    eval: function(){
        var ret = [];
        for(var i in this.slice()) ret.push(new this.model(this.__data__[this[i]]));
        return ret;
    },
    eval_raw: function(){
        var ret = [];
        for(var i in this.slice()) ret.push(this.__data__[this[i]]);
        return ret;
    }
});

var db_model_extend = {
    get: function(id){
        var dfd = Q.defer();
        while(1){
            var _this = this;
            if (!id) {_.defer(dfd.reject,"No id specified"); break;}
            try {var id = new ObjectID(id);}
            catch(e) {_.defer(dfd.reject,"Wrong ObjectId. Object doesn't exist."); break;}
            var cursor = $(this).find({_id: id});
            cursor.toArray(function(e,data){
                if (e) return dfd.reject(e);
                if (data.length == 0) return dfd.reject("Object "+_this.model.model_name+":"+id+" doesn't exist");
                var obj = new _this.model(data[0]);
                obj.id = data[0]._id.toString();
                dfd.resolve(obj);
            });
            break;
        }
        return dfd.promise;
    },
    find: function(where_clause){
        var dfd = Q.defer();
        var _this = this;
        $(this).find(where_clause).toArray(function(e,data){
            if (e || !data) dfd.reject(e);
            else dfd.resolve(new db_queryset(_this.model,data));
        });
        return dfd.promise;
    }
};

var db_objet_extend = {
    save: function(){
        var dfd = Q.defer();
        var _this = this;
        if (!this.id) {
            $(this).insert(this.attributes,function(e,a){
                if (e) return dfd.reject(e);
                if (!a) return dfd.reject("Can't create new object of "+_this.model.model_name);
                _this.attributes = a[0];
                _this.id = _this.attributes._id.toString();
                return dfd.resolve(_this);
            });
        }
        else {
            delete _this.attributes._id;
            $(this).update({_id: new ObjectID(this.id)},this.attributes,{safe:true,upsert:true},function(e,a){
                if (e || !a) return dfd.reject(e);
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
                if (e) dfd.reject(e);
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
            throw Erro("Wrong model object type: should be a function");
        }
        _.extend(model.prototype,db_objet_extend);
        model.db = _.clone(db_model_extend);
        model.db.model = model;
    },
    QuerySet: db_queryset,
    init: function(db_name){
        var dfd = Q.defer();
        if (global.m.db){
            db = global.m.db;
            _.defer(dfd.resolve);
        }
        else {
            mongo.MongoClient.connect(db_name, function(err, dbObj) {
                if(err) throw err;
                global.m.db = dbObj;
                db = dbObj;
                dfd.resolve();
            });
        }
        return dfd.promise;
    }
};