var Q = require('q'),
    _ = require("underscore");
;

module.exports = function(self,process,logger,models){
    return function(cfg){
        cfg = cfg || m.cfg;
        cfg.path = cfg.path || __dirname;
        cfg.name = cfg.name || "";
        cfg = m.sys.require('/config/load_config')(cfg);
        var dfd = Q.defer();
        var pluginScope = {};
        self.initPlugin(cfg).then(
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
    }
};