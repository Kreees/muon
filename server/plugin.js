var Q = require('q'),
    _ = require("underscore"),
    models = require(global.m.__sys_path+"/server/lib/models/models.js"),
    plugins = require(global.m.__sys_path+"/server/lib/plugins/plugins.js")
;

module.exports = function(cfg)
{
    return function(){
        var dfd = Q.defer();
        var plugin_scope = {};
        plugins.init(cfg).then(
            function(a){
                for(var i in a){
                    if (i in global.m.__plugins) continue;
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
}
