var Q = require("q"),
    _ = require("underscore")
    ;

module.exports = {
    init: function(cfg){
        var project_plug_loader = require(cfg.path+"/lib/plugin_loader.js");
        var plugins_scope = {}
        var dfd = Q.defer();
        var plugins = _.keys(cfg.plugins);
        function load_plugin(){
            if (plugins.length == 0){
                _.defer(dfd.resolve,plugins_scope);
                return;
            }
            var plugin = plugins.shift();
            var cfg_obj = cfg.plugins[plugin];
            delete cfg.plugins[plugin]
            plugin = plugin.toLocaleUpperCase();
            cfg.plugins[plugin] = cfg_obj;
            try{
                cfg.plugins[plugin].parent = cfg.name;
                var plugin_obj = project_plug_loader(plugin).plugin();;
                plugin_obj.init(cfg.plugins[plugin]).then(function(scope){
                    plugins_scope[plugin] = scope;
                    plugins_scope[plugin].plugin_obj = plugin_obj;
                    plugins_scope[plugin].name = plugin;
                    plugins_scope[plugin].cfg = cfg.plugins[plugin];
                    load_plugin();
                });
            }
            catch(e){
                console.log(e.stack);
                throw e;
            }
        }
        load_plugin();
        return dfd.promise;
    }
}