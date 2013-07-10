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
            try{
                cfg.plugins[plugin].parent = cfg.name;
                var plugin_obj = project_plug_loader(plugin).plugin(cfg.plugins[plugin]);
                plugin_obj().then(function(scope){
                    plugins_scope[plugin] = scope;
                    plugins_scope[plugin].name = plugin;
                    plugins_scope[plugin].cfg = cfg.plugins[plugin];
                    load_plugin();
                });
            }
            catch(e){throw e;}
        }
        load_plugin();
        return dfd.promise;
    }
}