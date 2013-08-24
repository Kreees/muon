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
        var new_obj = _.clone(this);
        new_obj["actions"] =  _.clone(this.actions || {});
        (function(object){
            for(var i in object){
                if (i == "extend") continue;
                if (i == "actions"){
                    _.extend(new_obj.actions,object.actions);
                }
                else {
                    new_obj[i] = object[i];
                }
            }
        })(extend_obj);
        new_obj.super = rest;
        new_obj.extend = this.extend;
        return new_obj;
    }
};
m.rest = rest;
module.exports = rest;