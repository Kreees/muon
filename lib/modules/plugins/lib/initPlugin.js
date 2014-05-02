

module.exports = function(self,deps){
    var loadDeps = self.require("lib/loadDepPlugins");
    var _ = require("underscore");
    return function(cfg){
        cfg = cfg || {};
        cfg = deps.config.load(cfg);
        cfg.name = cfg.name || "";
        var pluginScope = {};
        Object.defineProperty(pluginScope,"cfg",{get: function(){return JSON.parse(JSON.stringify(cfg));}});
        return loadDeps(cfg)
            .then(function(plugins){
                pluginScope.plugins = {};
                for(var i in plugins) pluginScope.plugins[i] = plugins[i];
            })
            .then(_.partial(deps.models.initScope.bind(deps.models),cfg))
            .then(function(models){
                pluginScope.models = models;
                pluginScope.getModel = function(modelName){return deps.models.getModel(modelName,cfg.name)};
            })
            .then(_.partial(deps.helpers.initScope.bind(deps.helpers),pluginScope,cfg));
    }
};