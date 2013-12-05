var Q = require('q'),
    _ = require("underscore"),
    models = require(global.m.__sys_path+"/server/lib/models/models.js"),
    plugins = require(global.m.__sys_path+"/server/lib/plugins/plugins.js"),
    packageTranslation = require(m.__sys_path+"/server/lib/client/package_translation"),
    packageRender = require(m.__sys_path+"/server/lib/client/package_render")
;

function initPlugin(cfg){
    cfg = cfg || {};
    cfg.path = __dirname;
    cfg = require('../lib/load_config.js')(cfg);
    var dfd = Q.defer();
    var pluginScope = {};
    plugins.init(cfg).then(
        function(a){
            for(var i in a){
                if (i in m.__plugins) continue;
                global.m.__plugins[i] = a[i];
                pluginScope.plugins[i] = a[i];
            }
            models.init(cfg).then(
                function(a){
                    for(var i in a) pluginScope[i] = a[i];
                    pluginScope.plugins = {};
                    dfd.resolve(pluginScope);
                }).done();
        }).done();
    return dfd.promise;
}

module.exports = {
    packageRender: packageRender,
    packageTranslation: packageTranslation,
    init: initPlugin
}
