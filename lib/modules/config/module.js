/**
 *
 */

module.exports = function(self){
    var config = null;
    var loadConfig = self.require("config");

    function get(dotSeparatedName){
        if (typeof dotSeparatedName != "string") throw Error("[config]")
        var parts = dotSeparatedName.split(".");
        var ret;
        parts.reduce(function(from,part){
            if (from === undefined){
                ret = undefined;
                return undefined;
            }
            ret = from[part];
            return ret;
        },config || {});
        if (typeof ret == "object") return JSON.parse(JSON.stringify(ret));
        return ret;
    }

    return {
        __public__: function(){
            if (config && typeof config == "object") {
                var obj = JSON.parse(JSON.stringify(config));
                Object.defineProperty(obj,"get",{value: get});
                return obj;
            }
            else return null;
        },
        load: function(subst){
            if (config && subst && typeof subst.path == "string" && subst.path != config.path){
                return loadConfig(subst);
            }
            if (config == null) {
                config = loadConfig(subst)
            }
            return config;
        }
   }
}