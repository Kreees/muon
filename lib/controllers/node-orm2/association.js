var c = {
    "actions":{
        "create": function(req,res,id,some){
            var dfd = Q.defer();
            var a = new this.model();
            editModelObject(dfd,this.model,a,this.data);
            return dfd.promise;
        },
        "remove": function(req,res,id){
            var dfd = Q.defer();
            getObject.call(this,id).then(function(obj){
                obj.remove(function(e){
                    if (e) dfd.reject([500,e]);
                    else dfd.resolve(obj);
                })
            },dfd.reject).done();
            return dfd.promise;
        },
        "get": function(req,res,id){
            return getObject.call(this,id);
        },
        "index": function(){
            var dfd = Q.defer();
            this.model.find({},function(e,a){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(a);
            });
            return dfd.promise;
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
m.AssociationController = c;
module.exports = c;