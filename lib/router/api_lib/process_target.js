var rest = m.__require__("/controllers/resource.js").run,
    _ = require("underscore"),
    Q = require("q"),
    getPermissions = require("./permission_check").getPermissions,
    checkPermissions = require("./permission_check").checkPermissions,
    runDependencies = require("./middleware_run").runDependencies,
    doAction = require("./process_action").doAction
;

module.exports = {
    targetIsModel: function(dfd,req,res,name,action,target){
        var controller = null;
        if (target.model.scopes && name in target.model.scopes){
            target = target.model.scopes[name];
            name = null;
        }
        else if (target.model.objects && name in target.model.objects)
            target = target.model.objects[name];
        controller = target.controller;
        action = (action == "get" && !name)?"index":action;
        if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
            if (target.permissions.indexOf(action) == -1){
                return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
            }
        }
        if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
            return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
        }

        req.context.controller = controller;
        req.context.target = target;
        req.context.action = action;
        req.context.model = target.model;
        req.context.name = name;
        req.context.id = name;
        runDependencies(dfd,target,req,res,function(){
            if(req.context.permissions.indexOf(target.model.modelName) != -1)
                return doAction(dfd,req,res,controller,action,target,name);
            req.context.permissions.push(target.model.modelName)
            getPermissions(controller.permissions,req)
                .then(function(permissions){
                    checkPermissions(permissions,controller,action)
                        .then(function(){
                            doAction(dfd,req,res,controller,action,target,name);
                        },dfd.reject).done()
                },dfd.reject).done()
        });
    },
    targetIsObject: function(dfd,req,res,name,action,target){
        var controller = null;
        if (target.scopes && name in target.scopes){
            controller = target.scopes[name].controller;
            name = null;
        }
        else controller = target.controller;
        action = (action == "get" && !name)?"index":action;
        if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
            if (target.permissions.indexOf(action) == -1){
                return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"])
            }
        }
        if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
            return _.defer(dfd.reject,403,["Action '"+action+"' is not allowed"])
        }

        req.context.controller = controller;
        req.context.target = target;
        req.context.action = action;
        req.context.model = target.model;
        runDependencies(dfd,target.model,req,res,function(){
            if(req.context.permissions.indexOf(target.model.modelName) != -1) return doAction();
            req.context.permissions.push(target.model.modelName)
            getPermissions(target.permissions,req).then(function(permissions){
                checkPermissions(permissions,controller,action)
                    .then(function(){
                        getPermissions(controller.permissions,req)
                            .then(function(permissions){
                                checkPermissions(permissions,controller,action)
                                    .then(function(){
                                        doAction(dfd,req,res,controller,action,target,name);
                                    },dfd.reject).done();
                            },dfd.reject).done();
                    },dfd.reject).done();
            },dfd.reject).done();
        });
    }
}