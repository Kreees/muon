var _ = require("underscore"),
    Q = require("q")
;

var rest = {
    "actions":{
        "create": function(req,res){
            var a = new this.model();
            for(var i in this.data) a[i] = this.data[i];
            return new this.model().save(function(){});
        },
        "edit": function(req,res,id){
            var _this = this;
            var dfd = Q.defer();
            this.model.get(id,function(e,a){
                    if (e) return dfd.reject([404,"Not found"]);
                    a = _this.data;
                    a.save().then(dfd.resolve,dfd.reject).done();
                },
                dfd.reject
            );
            return dfd.promise;
        },
        "remove": function(req,res,id){
            var dfd = Q.defer();
            this.model.get(id).then(
                function(a){
                    a.del().then(dfd.resolve,dfd.reject).done();
                },
                dfd.reject).done();
            return dfd.promise;
        },
        "get": function(req,res,id){
            var dfd = Q.defer();
            try {id = m.objId(id)}
            catch(e){
                return null;
            }
            this.model.find({$and:[{"_id":id},req.__compiledWhere__]}).
                run(function(e,a){
                    if (e) dfd.reject([500, e]);
                    else {
                        if (a.length == 0) dfd.reject([404, "Not found"]);
                        dfd.resolve(a[0]);
                    }
                });
            return dfd.promise;
        },
        "index": function(req){
            var dfd = Q.defer();
            this.model.find(req.__compiledWhere__,function(e,a){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(a);
            });
            return dfd.promise;
        },
        "search": function(req){
            return this.model.find({$and:[req.__compiledWhere__,this.data]});
        },
        "paginator": function(req){
            var skip = parseInt(req.query.__skip__) || 0;
            var limit = parseInt(req.query.__limit__) || 0;
            delete req.query.__skip__;
            delete req.query.__limit__;
            return this.model.find({$and:[req.__compiledWhere__,this.data]}).skip(skip).limit(limit);
        },
        "length": function(req,res){
            var dfd = Q.defer();
            this.model.count().then(function(a){dfd.resolve([a]);},dfd.reject).done();
            return dfd.promise;
		}
        
    },
    extend: function(extension){
        var newObject = _.clone(this);
        newObject.actions =  _.clone(this.actions || {});
        newObject.dependencies =  (newObject.dependencies || []).map(function(a){
            var plName = newObject.pluginName;
            return (plName?plName+":":"")+a;
        });
        newObject.pluginName = "";
        for(var i in extension){
            if (["extend"].indexOf(i) != -1) continue;
            switch(i){
                case "actions": _.extend(newObject.actions,extension.actions); break;
                case "dependencies": newObject[i] = newObject[i].concat(extension[i]); break;
                default: newObject[i] = extension[i];
            }
        }
        newObject.super = this;
        newObject.extend = this.extend;
        return newObject;
    }
};
m.rest = rest;
module.exports = rest;