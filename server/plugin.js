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
                plugin_scope.plugins = a;
                models.init(cfg).then(
            function(a){
                for(var i in a) plugin_scope[i] = a[i];
                plugin_scope.plugins = {};
                dfd.resolve(plugin_scope);
            })});
        return dfd.promise;
    }
}
