var rest = m.sys.require("/controllers/resource.js").run,
    _ = require("underscore"),
    Q = require("q"),
    getPermissions = require("./permission_check").getPermissions,
    checkPermissions = require("./permission_check").checkPermissions,
    runDependencies = require("./middleware_run").runDependencies,
    doAction = require("./process_action").doAction
;

module.exports = {
    targetIsModel: function(dfd,req,res,target,name,action){
        var actionModule = null;
        if (name in target.model.scopes){
            target = target.model.scopes[name];
            name = null;
        }
        else if (name in target.model.objects)
            target = target.model.objects[name];
        actionModule = target.actionModule;
        action = (action == "get" && !name)?"index":action;
        if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
            if (target.permissions.indexOf(action) == -1){
                return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
            }
        }
        if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
            return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
        }

        req.context.actionModule = actionModule;
        req.context.target = target;
        req.context.action = action;
        req.context.model = target.model;
        req.context.name = name;
        req.context.id = name;

        runDependencies(dfd,target,req,res,function(){
            if(req.context.permissions.indexOf(target.model.modelName) != -1)
                return doAction(dfd,req,res,actionModule,action,target,name);
            req.context.permissions.push(target.model.modelName)
            getPermissions(actionModule.permissions,req)
                .then(function(permissions){
                    checkPermissions(permissions,actionModule,action)
                        .then(function(){
                            doAction(dfd,req,res,actionModule,action,target,name);
                        },dfd.reject).done()
                },dfd.reject).done()
        });
    },
    targetIsObject: function(dfd,req,res,target,name,action){
        var model = m.getModel(target.__fullName__);

        if (name in model.hasOneRelations) {
            target["get"+name[0].toUpperCase() +name.substr(1,name.length-1)](function(e,a){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(a);
            })
        }
        else if (name in model.hasManyRelations) {
            target["get"+name[0].toUpperCase() +name.substr(1,name.length-1)](function(e,a){
                if (e) dfd.reject([500,e]);
                else dfd.resolve(a);
            })
        } else dfd.reject([404,"Relation not found"]);
    }
}