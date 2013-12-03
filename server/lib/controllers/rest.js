var _ = require("underscore"),
    Q = require("q")
;

var rest = {
    "actions":{
        "create": function(req,res){
            return new this.model(this.data).save();
        },
        "edit": function(req,res,id){
            var dfd = Q.defer();
            this.model.db.get(id).then(
                function(a){
                    a.set(this.data);
                    a.save().then(dfd.resolve,dfd.reject);
                },
                dfd.reject
            );
            return dfd.promise;
        },
        "remove": function(req,res,id){
            var dfd = Q.defer();
            this.model.db.get(id).then(
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
            this.model.db.find({$and:[{"_id":id},req.__compiledWhere__]}).
                then(function(a){
                    if (a.length == 0) dfd.reject(null);
                    else dfd.resolve(a.eval()[0]);
                },dfd.reject);
            return dfd.promise;
        },
        "index": function(req){
            return this.model.db.find(req.__compiledWhere__);
        },
        "search": function(req){
            return this.model.db.find({$and:[req.__compiledWhere__,this.data]})
        }
    },
    extend: function(extension){
        var newObject = _.clone(this);
        newObject["actions"] =  _.clone(this.actions || {});
        (function(object){
            for(var i in object){
                if (i == "extend") continue;
                if (i == "actions"){
                    _.extend(newObject.actions,object.actions);
                }
                else {
                    newObject[i] = object[i];
                }
            }
        })(extension);
        newObject.super = rest;
        newObject.extend = this.extend;
        return newObject;
    }
};
m.rest = rest;
module.exports = rest;