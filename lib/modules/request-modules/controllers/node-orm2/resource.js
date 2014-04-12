var _ = require("underscore"),
    Q = require("q"),
    PlainController = m.sys.require("/app/controllers/controller")
;

var serviceParams = ["_id","modified_at","created_at"];

function getObject(id){
    var dfd = Q.defer();
    try {
        this.model.find({_id: id},function(e,a){
            if (e) dfd.reject([500, e]);
            else {
                if (a.length == 0) dfd.reject([404, "Not found"]);
                else if (a.length > 1) dfd.reject([500,"To many object by this id"]);
                else dfd.resolve(a[0]);
            }
        });
    }
    catch(e){
        if (e.message.indexOf("Argument passed in must be a single String of 12 bytes") != -1) _.defer(dfd.reject,[404,"Not found"]);
        else _.defer(dfd.reject,[500,e]);
    }
    return dfd.promise;
}

function compareIds(a1,a2){
    a1 = a1.map(function(a1el){
        return a1el.toString();
    });
    a2 = a2.map(function(a2el){
        return a2el.toString();
    });
    return m.utils._.isEqual(a1,a2);
}

function capitalize(str){
    if (typeof str !== "string") throw Error("argument should be a string");
    if (str.length == 0) return "";
    return str.charAt(0).toLocaleUpperCase()+str.substring(1,str.length);
}

function getModelById(a,modelName){
    var dfd = Q.defer();
    var model = m.app.getModel(modelName);
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
    var model = m.app.getModel(modelName);
    model.find({_id: a},function(e,arr){
        if (e) dfd.reject([400,e]);
        else if (compareIds(a,m.utils._.pluck(arr,"_id"))) dfd.resolve(arr);
        else dfd.reject([400,"Wrong object list for model"]);
    });
    return dfd.promise;
}

function editModelObject(dfd,Model,a,data){
    for(var key in Model.allProperties){
        if ((serviceParams.indexOf(key) != -1) || (a[key] == data[key])) delete data[key];
        else a[key] = null;
    }

    var props = m.utils._.keys(data);
    (function setProperty(){
        if (props.length == 0) {
            return a.save(function(e,newA){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(newA);
            });
        }
        var key = props.shift();
        if (key in Model.allProperties) {
            if (!(key+"_id" in Model.hasOneRelations || key in Model.hasOneRelations)){
                if (serviceParams.indexOf(key) == -1){
                    a[key] = data[key];
                }
                return setProperty();
            }
        }
        try {
            if (key+"_id" in Model.hasOneRelations || key in Model.hasOneRelations){
                key = key.replace(/_id$/,"");
                getModelById(data[key],Model.hasOneRelations[key]).then(function(ref){
                    try{
                        a["set"+capitalize(key)](ref,function(err){
                            if (err) dfd.reject([400,"Can't set "+key+" attribute",err])
                            else setProperty();
                        });
                    }
                    catch(e){ return dfd.reject([500,e]); }
                }, function(ret){_.defer(dfd.reject,ret);});
                return;
            }
            if (key in Model.hasManyRelations){
                var refs = (data[key] instanceof Array)?data[key]:m.utils._.keys(data[key]);
                getModelsById(refs,Model.hasManyRelations[key]).then(function(refs){
                    try{
                        a["set"+capitalize(key)](refs,function(err){
                            if (err) dfd.reject([400,"Can't set "+key+" attribute",err])
                            else setProperty();
                        });
                    }
                    catch(e){
                        return dfd.reject([500,e]);
                    }
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

function ResourceController(){}

var superController = PlainController;

ResourceController.prototype = superController.extend({
    "actions":{
        "create": function(){
            var dfd = Q.defer();
            var a = new this.model();
            editModelObject(dfd,this.model,a,this.data);
            return dfd.promise;
        },
        "edit": function(req,res,id){
            var dfd = Q.defer();
            var _this = this;
            getObject.call(this,id).then(function(obj){
                editModelObject(dfd,_this.model,obj,_this.data);
            },dfd.reject).done();

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
        "search": function(){
            var dfd = Q.defer();
            try {
                this.model.find(this.data,function(e,a){
                    if (e) dfd.reject([500,e]);
                    else dfd.resolve(a);
                });
            }
            catch(e){
                m.log(e);
            }
            return dfd.promise;
        },
        "length": function(req,res){
            var dfd = Q.defer();
            this.model.count().then(function(a){dfd.resolve([a]);},dfd.reject).done();
            return dfd.promise;
		}
        
    }
});

var c = new ResourceController();
m.ResourceController = c;
module.exports = c;