var _ = require("underscore"),
    Q = require("q")
;

var serviceParams = ["_id","modified_at","created_at"];

function compareIds(a1,a2){
    a1 = a1.map(function(a1el){
        return a1el.toString();
    });
    a2 = a2.map(function(a2el){
        return a2el.toString();
    });
    return m._.isEqual(a1,a2);
}

function capitalize(str){
    if (typeof str !== "string") throw Error("argument should be a string");
    if (str.length == 0) return "";
    return str.charAt(0).toLocaleUpperCase()+str.substring(1,str.length);
}

function getModelById(a,modelName){
    var dfd = Q.defer();
    var model = m.getModel(modelName);
    if (typeof a == "object"){
        if (a instanceof model) _.defer(drd.resolve,a);
        else _.defer(dfd.reject,[400,"getModel: model should be an instance of proper model class"]);
    }
    else {
        model.get(a,function(e,a){
           if (e) dfd.reject([400,e]);
           else dfd.resolve(a);
        });
    }
    return dfd.promise;
}

function getModelsById(a,modelName){
    var dfd = Q.defer();
    var model = m.getModel(modelName);
    model.find({_id: a},function(e,arr){
        if (e) dfd.reject([400,e]);
        else if (compareIds(a,m._.pluck(arr,"_id"))) dfd.resolve(arr);
        else dfd.reject([400,"Wrong object list for model"]);
    });
    return dfd.promise;
}

function editModelObject(dfd,Model,a,data){
    for(var key in Model.allProperties){
        if (serviceParams.indexOf(key) != -1) continue;
        if (a[key] == data[key]) delete data.key;
        else a[key] = null;
    }
    var props = m._.keys(data);
    (function setProperty(){
        if (props.length == 0) {
            return a.save(function(e,newA){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(newA);
            });
        }
        var key = props.shift();
        if (key in Model.allProperties) {
            if (serviceParams.indexOf(key) == -1){
                a[key] = data[key];
            }
            return setProperty();
        }
        try {
            if (key+"_id" in Model.hasOneRelations || key in Model.hasOneRelations){
                key = key.replace(/_id$/,"")
                getModelById(data[key],Model.hasOneRelations[key]).then(function(ref){
                    a["set"+capitalize(key)](ref,function(err){
                        if (err) dfd.reject([400,"Can't set "+key+" attribute",err])
                        else setProperty();
                    });
                }, function(ret){_.defer(dfd.reject,ret);});
                return;
            }
            if (key in Model.hasManyRelations){
                var refs = (data[key] instanceof Array)?data[key]:m._.keys(data[key]);
                getModelsById(refs,Model.hasManyRelations[key]).then(function(refs){
                    a["set"+capitalize(key)](refs,{},function(err){
                        if (err) dfd.reject([400,"Can't set "+key+" attribute",err])
                        else setProperty();
                    });
                }, function(ret){_.defer(dfd.reject,ret);});
                return;
            }
        }
        catch(e){
            _.defer(dfd.reject,[500, e.message]);
            return;
        }
        setProperty()
    })();
}

var rest = {
    "actions":{
        "create": function(){
            var dfd = Q.defer();
            editModelObject(dfd,this.model,new this.model(),this.data)
            return dfd.promise;
        },
        "edit": function(req,res,id){
            var dfd = Q.defer();
            var _this = this;
            this.model.find({_id: id},function(err,a){
                if (err) return _.defer(dfd.reject,[500,err]);
                if (a.length == 0) return _.defer(dfd.reject,[404,"Not found"]);
                editModelObject(dfd,_this.model,a[0],_this.data);
            });
            return dfd.promise;
        },
        "remove": function(req,res,id){
            var dfd = Q.defer();
            this.model.get(id,function(e,a){
                if (e) {
                    if (e.code == 2) dfd.reject([404, "Not found"]);
                    else dfd.reject([500, e]);
                }
                else{
                    a.remove(function(e){
                        if (e) dfd.reject([500,e]);
                        else dfd.resolve(a);
                    })
                }
            });
            return dfd.promise;
        },
        "get": function(req,res,id){
            var dfd = Q.defer();
            this.model.get(id,function(e,a){
                if (e) {
                    if (e.code == 2) dfd.reject([404, "Not found"]);
                    else dfd.reject([500, e]);
                }
                else dfd.resolve(a);
            });
            return dfd.promise;
        },
        "index": function(){
            var dfd = Q.defer();
            this.model.find({},function(e,a){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(a);
            });
            return dfd.promise;
        },
        "search": function(){
            var dfd = Q.defer();
            try {
                this.model.find(this.data,function(e,a){
                    if (e) dfd.reject([500,e]);
                    else dfd.resolve(a);
                });
            }
            catch(e){
                console.log(e);
            }
            return dfd.promise;
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