/**
 * Plugin manager - part of muon, that maintains plugin structure of muon-application.
 * App consists of different independent parts, that implements different application tasks (like user,session,settings,messages etc.)
 * In general app presents a root plug, that references to subplugins and so on.
 *
 */

module.exports = function(self,deps){
    var plugins = {};
    var _ = require("underscore");
    var fs = require("fs");
    var initPlugin = self.require("lib/initPlugin");

    function appendNewModel(model){
        var plugin = self.getPlugin(model.pluginName);
        plugin.models[model.modelName] = model;
    }

    return {
        /**
        * Initialize whole application
        */
        __init__: function(){
            return self.initPlugin(deps.config.load()).then(function(scope){
                m.app = scope;
            }).then(function(){
                m.on('model-defined',appendNewModel);
            });
        },
        __deinit__: function(){
            m.removeListener('model-defined',appendNewModel);
        },
        initPlugin: function(cfg){
            return initPlugin(cfg).then(function(plugin){
                plugins[cfg.name || ""] = plugin;
                return plugin;
            });
        },
        getPlugin: function(name){
            return plugins[name];
        },
        getPluginsNames: function(){
            return _.keys(plugins);
        },
        getModels: function(plugin,filter){
            filter = filter || ["*"];
            var names = deps.models.getModelsNames();
            return names.filter(function(name){
               if (RegExp("^"+(plugin.cfg.name.length > 0?plugin.cfg.name+":":"")).test(name)){
                   for(var i in filter){
                       var token = filter[i];
                       token = token.replace(/\./g,"\\.").replace(/\*/g,".*?");
                       token = (plugin.cfg.name.length > 0?plugin.cfg.name+":":"")+token;
                       token = RegExp("^"+token+"$");
                       if (token.test(name)) return true;
                   }
               }
               return false;
            }).map(function(name){
                return deps.models.getModel(name);
            });
        },
        getPackages: function(plugin){
            var ret = {};
            var plugins = plugin?[plugin]:self.getPluginsNames().map(self.getPlugin);
            plugins.forEach(function(plugin){
                if (!fs.existsSync(plugin.cfg.path+"/client/packages")) return;
                else{
                    var temp = fs.readdirSync(plugin.cfg.path+"/client/packages").filter(function(packName){
                        return fs.existsSync(plugin.cfg.path+"/client/packages/"+packName+"/package.js");
                    });
                    temp.forEach(function(packName){
                        var fullPackName = (plugin.cfg.name.length > 0?plugin.cfg.name+":":"")+packName;
                        ret[fullPackName] = plugin.cfg.path+"/client/packages/"+packName;
                    })
                }
            })
            return ret;
        }
   }
}