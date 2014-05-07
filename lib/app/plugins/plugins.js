var Q = require("q"),
    _ = require("underscore"),
    loadPlugin = require("./loadPlugin")
    ;

exports.init = function(cfg){
    var pluginScope = {};
    var currentPlugin = require(cfg.path+"/module");
    var dfd = Q.defer();
    var plugins = _.keys(cfg.plugins);
    function loadNext(){
        if (plugins.length == 0){
            _.defer(dfd.resolve,pluginScope);
            return;
        }
        var pluginName = plugins.shift();
        var pluginUppercaseName = pluginName.toLocaleUpperCase();
        var cfgObject = cfg.plugins[pluginName];
        cfgObject.parent = cfg.name;
        cfgObject.name = (cfg.name?cfg.name+":":"")+pluginUppercaseName;
        try{
            var pluginObject = currentPlugin.require(pluginName);
            cfgObject.path = pluginObject.path;
            loadPlugin.init(cfgObject).then(function(scope){
                pluginScope[pluginUppercaseName] = scope;
                scope.cfg = cfgObject;
                loadNext();
            },function(){
                m.kill("Can't load plugin: "+path);
            }).done();
        }
        catch(e){ m.kill(e); }
    }
    loadNext();
    return dfd.promise;
};