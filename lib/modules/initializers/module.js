/**
 * Initializers module
 */

module.exports = function(self,deps){
    var Q = require("q");
    var _ = require("underscore");
    var fs = require("fs");
    var path = require("path");
    return {
        __init__: function(){
            var dfd = Q.defer();
            var modelNames = deps.models.getModelsNames();
            function nextModel(){
                if (modelNames.length == 0) return _.defer(dfd.resolve);
                var modelName = modelNames.shift();
                var model = deps.models.getModel(modelName);
                if (!model.modulePath) return nextModel();
                var plugin = deps.plugins.getPlugin(model.pluginName);

                var initializerPath = model.modulePath.replace(path.normalize(plugin.cfg.path + "/server/app/models/"),plugin.cfg.path + "/server/app/initializers/");

                if (!fs.existsSync(initializerPath)) return nextModel();

                try{ var initMod = require(initializerPath); }
                catch(e){ return _.defer(dfd.reject,e) }
                if (typeof initMod != "function")
                    return _.defer(dfd.reject,new Error("Initializer module.exports should be a function: "));

                Q.when(initMod.apply(model,[plugin.cfg])).then(nextModel,dfd.reject);
            }
            nextModel();
            return dfd.promise;
        }
    }
}