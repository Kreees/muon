/**
 * Plugin manager - part of muon, that maintains plugin structure of muon-application.
 * App consists of different independent parts, that implements different application tasks (like user,session,settings,messages etc.)
 * In general app presents a root plug, that references to subplugins and so on.
 *
 */

module.exports = function(self){
   return {
       /**
        * Initialize whole application
        */
       __init__: function(){
           var dfd = m.utils.Q.defer();
           self.initPlugin("").then(function(scope){
               m.app = scope;
               dfd.resolve(scope);
           },dfd.reject).done();
           return dfd.promise;
       },
       __deinit__: function(){

       },
       __reload__: function(){

       },
       initPlugin: function(cfg){
           var pluginScope = {};
           var currentPlugin = require(cfg.path+"/module");
           var dfd = Q.defer();
           var plugins = _.keys(cfg.plugins);
           var loadPlugin = self.require("loadPlugin");
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
       }
   }
}