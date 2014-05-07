module.exports = function(self,deps){
    var _ = require("underscore");
    var Q = require("Q");

    var ResourceController = self.require("controllers/node-orm2/resource");
    var AssociationController = self.require("controllers/node-orm2/association");
    var PlainController = self.require("controllers/controller");

    var controllers = {};
    var middleware = {};

    var initModelControllersScope = self.require("lib/initControllers");
    var initModelMiddlewareScope = self.require("lib/initMiddleware");

    return {
        __init__: function(){
            var models = deps.models.getModelsNames().map(function(modName){
                return deps.models.getModel(modName);
            });
            var promise = Q();
            models.reduce(function(p,model){
                return promise = p.then(_.partial(initModelControllersScope,model)).catch(function(e){
                    deps.logger.exception("Can't init '"+model.modelName+"' models' controllers",e);
                }).then(_.partial(initModelMiddlewareScope,model)).catch(function(e){
                    deps.logger.exception("Can't init '"+model.modelName+"' models' middleware",e);
                });
            },promise);
            return promise;

        },

        defineController: function(controller,model,name,path){
            if (!(model.fullName in controllers)) controllers[model.fullName] = {};
            var ctr = controllers[model.fullName];

            if (typeof controller == "function" && !(controller.prototype instanceof PlainController))
                deps.logger.exception("Controller should be extended by PlainController class via extend method")

            if (typeof controller == "object") controller = PlainController.extend(controller);
            ctr[name] = new controller();
            ctr[name].modulePath = path;
            ctr[name].pluginName = model.pluginName;
        },
        getController: function(model,name){
            name = name || "";
            if (typeof model == "string")
                model = deps.models.getModel(model);
            if (!(model.fullName in controllers)) return undefined;
            return controllers[model.fullName][name];
        },
        defineMiddleware: function(midd,model,path){
            if (model.fullName in middleware)
                deps.logger.error("Middleware for model '"+model.fullName+"' is already assigned");

            if (typeof midd != "function")
                deps.logger.exception("Middleware module for model '"+model.fullName+"' is not a function");

            middleware[model.fullName] = midd;
            middleware[model.fullName].modulPath = path;
        },
        getMiddleware: function(model){
            if (typeof model == "string")
                model = deps.models.getModel(model);
            return middleware[model.fullName];
        },
        ResourceController: ResourceController,
        AssociationController: AssociationController,
        PlainController: PlainController,
        controllers: function() {return controllers;},
        middleware: function() {return middleware},
        __public__: function(){
            var obj = {};
            Object.defineProperty(obj,"ResourceController",{get: function(){return new self.ResourceController();}})
            Object.defineProperty(obj,"PlainController",{get: function(){return new self.PlainController();}})
            Object.defineProperty(obj,"AssociationController",{get: function(){return new self.AssociationController();}})
            return obj;
        }
    }
}