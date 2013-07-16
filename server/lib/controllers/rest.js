var _ = require("underscore"),
    Q = require("q")
;

var rest = {
    "actions":{
        "create": function(req,res,id){
            var dfd = Q.defer();
            if (id) _.defer(dfd.reject,"Wrong REST request");
            else {
                var a = new this(req.body)
                a.save().then(dfd.resolve,dfd.reject);
            }
            return dfd.promise;
        },
        "edit": function(req,res,id){
            var dfd = Q.defer();
            this.objects.get(id).then(
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
            this.objects.get(id).then(
                function(a){
                    a.del().then(dfd.resolve,dfd.reject);
                },
                dfd.reject);
            return dfd.promise;
        },
        "get": function(req,res,id){
            var dfd = Q.defer();
            this.objects.get(id).
                then(dfd.resolve,dfd.reject);
            return dfd.promise;
        },
        "index": function(req){
            var dfd = Q.defer();
            this.objects.find()
                .then(dfd.resolve,dfd.reject);
            return dfd.promise;
        },
        "search": function(req){
            var dfd = Q.defer();
            var query = null;
            if (req.method == "GET") query = req.query;
            if (req.method == "POST") query = req.body;
            this.objects.find(query)
                .then(dfd.resolve,dfd.reject);
            return dfd.promise;
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