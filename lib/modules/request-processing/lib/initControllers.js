module.exports = function(self,deps){
    var path = require("path");
    var fs = require('fs');
    var _ = require("underscore");

    function getControllersDir(model){
        var plugin = deps.plugins.getPlugin(model.pluginName);
        return path.normalize(plugin.cfg.path+"/server/app/controllers/"+model.modelName.replace(/\./,"/"));
    }

//    return function(){};
    return function(model){
        var plugin = deps.plugins.getPlugin(model.pluginName);
        var ctrlrPath = getControllersDir(model);

        var superController, controller;
        if (model.super) superController = self.getController(model.super);
        else superController = new self.ResourceController();

        superController = new (superController.extend({}));

        if (fs.existsSync(ctrlrPath+".js")) {
            try {
                controller = require(ctrlrPath);
                if (typeof controller == "function") controller = controller(superController);
                else if (typeof controller != "object")
                    deps.logger.exception("Controller module should be an object or function returning controller object: " + ctrlrPath);
            }
            catch(e){ deps.logger.exception("Can't init controller for model '"+model.fullName+"'",e); }
        }
        else controller = superController;

        self.defineController(controller,model,"",ctrlrPath);

        var ignorePath = deps.plugins.getModels(plugin,[model.modelName+".*"]).map(getControllersDir);

        return deps.utils.fsExt.treePromise(ctrlrPath,ignorePath.concat("/_")).then(function(files){
            files.forEach(function(file){
                var name = file.replace(ctrlrPath+"/","").replace(/\.[\S]+$/,"");
                if (model.super) superController = self.getController(model.super,name);
                if (!superController){
                    if ((name in model.hasManyRelations) || (name in model.hasOneRelations))
                        superController = new self.AssociationController()
                    else superController = self.getController(model);
                }

                superController = new (superController.extend({}));

                try {
                    controller = require(file);
                    if (typeof controller == "function") controller = controller(superController);
                    else if (typeof controller != "object")
                        deps.logger.exception("Controller module should be an object or function returning controller object: " + ctrlrPath);
                }
                catch(e){ deps.logger.exception("Can't init controller: "+ctrlrPath,e); }
                self.defineController(controller,model,name,file);
            });
        });
    }
}