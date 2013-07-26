var _ = require("underscore"),
    Q = require("q")
;

var rest = {
    "actions":{
        "create": function(req,res){
            return new this.$model(req.body).save();
        },
        "edit": function(req,res,id){
            var dfd = Q.defer();
            this.$model.db.get(id).then(
                function(a){
                    a.set(req.body);
                    a.save().then(dfd.resolve,dfd.reject);
                },
                dfd.reject
            );
            return dfd.promise;
        },
        "delete": function(req,res,id){
            var dfd = Q.defer();
            this.$model.db.get(id).then(
                function(a){
                    a.del().then(dfd.resolve,dfd.reject);
                },
                dfd.reject);
            return dfd.promise;
        },
        "get": function(req,res,id){
            var dfd = Q.defer();
            try {id = m.objId(id)}
            catch(e){return null;}
            this.$model.db.find({$and:[{"_id":id},req.__compiled_where__]}).
                then(function(a){
                    if (a.length == 0) dfd.reject(null);
                    else dfd.resolve(a.eval()[0]);
                },dfd.reject);
            return dfd.promise;
        },
        "index": function(req){
            return this.$model.db.find(req.__compiled_where__);
        },
        "search": function(req){
            return this.$model.db.find({$and:[req.__compiled_where__,(req.method.toUpperCase() == "GET")?req.query:req.body]})
        }
    },
    extend: function(extend_obj){
        var _rest = {
            "actions": _.clone(rest.actions)
        };
        (function(object){
            for(var i in object){
                if (i == "extend") continue;
                if (i == "actions"){
                    _.extend(_rest.actions,object.actions);
                }
                else {
                    _rest[i] = object[i];
                }
            }
        })(extend_obj);
        _rest.super = rest;
        return _rest;
    }
};
global.m.rest = rest;
module.exports = rest;