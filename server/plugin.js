var Q = require('q'),
    _ = require("underscore"),
    models = require(global.m.__sys_path+"/server/lib/models/models.js"),
    plugins = require(global.m.__sys_path+"/server/lib/plugins/plugins.js"),
    package_translation = require(m.__sys_path+"/server/lib/client/package_translation"),
    package_render = require(m.__sys_path+"/server/lib/client/package_render")
;

function init_plugin(cfg){
    cfg = cfg || {};
    cfg.path = __dirname;
    cfg = require('../lib/load_config.js')(cfg);
    var dfd = Q.defer();
    var plugin_scope = {};
    plugins.init(cfg).then(
        function(a){
            for(var i in a){
                if (i in m.__plugins) continue;
                global.m.__plugins[i] = a[i];
                plugin_scope.plugins[i] = a[i];
            }
            models.init(cfg).then(
                function(a){
                    for(var i in a) plugin_scope[i] = a[i];
                    plugin_scope.plugins = {};
                    dfd.resolve(plugin_scope);
                })});
    return dfd.promise;
}

module.exports = {
    package_render: package_render,
    package_translation: package_translation,
    init: init_plugin
}
