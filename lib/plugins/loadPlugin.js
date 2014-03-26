var Q = require('q'),
    _ = require("underscore"),
    models = m.sys.require("/models/models"),
    plugins = m.sys.require("/plugins/plugins"),
    helpers = m.sys.require("/helpers/helpers"),
    packageTranslation = m.sys.require("/client/package_translation"),
    packageRender = m.sys.require("/client/package_render")
;

exports.init = function(cfg){
    cfg = cfg || {};
    cfg.path = cfg.path || __dirname;
    cfg.name = cfg.name || "";
    cfg = require('../load_config')(cfg);
    var dfd = Q.defer();
    var pluginScope = {};
    plugins.init(cfg).then(
        function(a){
            pluginScope.plugins = {};
            for(var i in a){
                if (i in m.__plugins) continue;
                global.m.__plugins[a[i].cfg.name] = a[i];
                pluginScope.plugins[i] = a[i];
            }
            models.init(cfg).then(
                function(a){
                    for(var i in a) pluginScope[i] = a[i];
                    pluginScope.getModel = models.getModel;
                    helpers.init(cfg,pluginScope).then(function(scope){
                        pluginScope.helpers = scope.helpers;
                        pluginScope.cfg = cfg;
                        dfd.resolve(pluginScope);
                    }).done();
                }).done();
        }).done();
    return dfd.promise;
};

exports.packageRender = packageRender;
exports.packageTranslation = packageTranslation;
