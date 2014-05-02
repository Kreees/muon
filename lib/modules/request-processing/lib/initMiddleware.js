module.exports = function(self,deps){
    var path = require("path");
    var fs = require('fs');
    var _ = require("underscore");

    function getMiddlewarePath(model){
        var plugin = deps.plugins.getPlugin(model.pluginName);
        return path.normalize(plugin.cfg.path+"/server/app/middleware/"+model.modelName.replace(/\./,"/")+".js");
    }

    return function(model){
        var middlewarePath = getMiddlewarePath(model);
        var middleware;
        if (!fs.existsSync(middlewarePath)){if (model.super) middleware = model.super.middleware;}
        else
            try { middleware = require(middlewarePath); }
            catch(e){ deps.logger.exception(e); }

        if (middleware) self.defineMiddleware(middleware,model,middlewarePath);
    }
}