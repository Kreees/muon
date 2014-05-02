module.exports = function(self,deps){
    var _ = require("underscore"),
        checkPermissions = self.require("lib/permissions"),
        runMiddleware = self.require("lib/middleware"),
        doAction = self.require("lib/action")
    ;

    var rp = deps["request-processing"];

    return {
        isModel: function(req,res,target,name,action){
            var controller = null;

            controller = rp.getController(target,name);
            if (controller instanceof rp.PlainController){
                name = null;
            } else controller = rp.getController(target);

            if (action == "get" && !name){
                if ("index" in controller.actions) action = "index";
                else action = "get";
            }

            if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
                if (target.permissions.indexOf(action) == -1){
                    return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
                }
            }
            if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
                return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
            }

            req.context.model = target;
            req.context.app = deps.plugins.getPlugin(target.pluginName)
            req.context.name = name;
            req.context.id = name;


            return runMiddleware(target,controller.dependencies,req,res).then(function() {
                return checkPermissions(controller,req,res,name,action);
            }).then(function(){
                return doAction(req,res,controller,action,target,name);
            });
        },

        isObject: function(req,res,target,name,action){
            var dfd = Q.defer();
            var model = deps.models.getModel(target.model().fullName);

            var relation;
            if (name in model.hasOneRelations) relation = model.hasOneRelations[name];
            if (name in model.hasManyRelations) relation = model.hasManyRelations[name];

            if (!relation) dfd.reject([404,"Relation not found"]);
            else {
                req.context.controller = rp.getController(req.context.model);
                req.context.action = action;
                req.context.model = req.context.app.getModel(relation)
                req.context.name = name;
                req.context.id = name;

                target["get"+name[0].toUpperCase() +name.substr(1,name.length-1)](function(e,a){
                    if (e) dfd.reject([500,e]);
                    else { dfd.resolve(a); }
                })
            }
            return dfd.promise;
        }
    }
}
