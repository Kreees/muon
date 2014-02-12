var Q = require('q'),
    _ = require("underscore"),
    models = m.__require__("/models/models"),
    plugins = m.__require__("/plugins/plugins"),
    packageTranslation = m.__require__("/client/package_translation"),
    packageRender = m.__require__("/client/package_render")
;

function initPlugin(cfg){
    cfg = cfg || {};
    cfg.path = __dirname;
    cfg = require('../lib/load_config')(cfg);
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
                    pluginScope.getModel = models.getModel;
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
