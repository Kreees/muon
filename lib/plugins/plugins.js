var Q = require("q"),
    _ = require("underscore")
    ;

module.exports = {
    init: function(cfg){
        var projectPluginLoader = require(cfg.path+"/lib/plugin_loader.js");
        var pluginScope = {}
        var dfd = Q.defer();
        var plugins = _.keys(cfg.plugins);
        function loadPlugin(){
            if (plugins.length == 0){
                _.defer(dfd.resolve,pluginScope);
                return;
            }
            var plugin = plugins.shift();
            var cfgObject = cfg.plugins[plugin];
            var pluginUppercaseName = plugin.toLocaleUpperCase();
            try{
                cfgObject.parent = cfg.name;
                var pluginObject = projectPluginLoader(plugin).plugin();
                pluginObject.init(cfgObject).then(function(scope){
                    pluginScope[pluginUppercaseName] = scope;
                    scope.pluginObject = pluginObject;
                    scope.name = pluginUppercaseName;
                    scope.cfg = cfgObject;
                    loadPlugin();
                }).done();
            }
            catch(e){ m.kill(e); }
        }
        loadPlugin();
        return dfd.promise;
    }
}