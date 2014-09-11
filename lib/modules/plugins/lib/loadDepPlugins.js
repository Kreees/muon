module.exports = function(self,deps){
    var Q = require("q");
    var _ = require("underscore");
    return function(cfg){
        var pluginScope = {};
        var currentPlugin = require(cfg.path+"/module");
        var dfd = Q.defer();
        var plugins = _.keys(cfg.plugins);
        function loadNext(){
            if (plugins.length == 0) return _.defer(dfd.resolve,pluginScope);
            var pluginName = plugins.shift();
            var pluginUppercaseName = pluginName.toLocaleUpperCase();
            var cfgObject = cfg.plugins[pluginName];
            cfgObject.parent = cfg.name;
            cfgObject.name = (cfg.name?cfg.name+":":"")+pluginUppercaseName;
            try{ var pluginObject = currentPlugin.require(pluginName); }
            catch(e){
                dfd.reject(new Error("Can't load plugin "+cfg.name+":"+pluginUppercaseName)); 
            }
            cfgObject.path = pluginObject.path;
            self.initPlugin(cfgObject).then(function(scope){
                pluginScope[pluginUppercaseName] = scope;
                scope.cfg = cfgObject;
                loadNext();
            }).catch(dfd.reject).done();
        }
        loadNext();
        return dfd.promise;
    }
}