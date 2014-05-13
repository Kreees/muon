module.exports = function(self,deps){
    function assignHelper(dfd,scope,files,rootPath){
        for(var i in files){
            var file = files[i];
            var nameParts = file.replace(rootPath,"").split("/");
            var helperName = nameParts.pop();
            if (helperName.match(/^_/) || !helperName.match(/\.js$/)) continue;
            else helperName = helperName.replace(/\.js$/,"");
            var obj = scope.helpers;
            nameParts.forEach(function(part){
                if (!obj[part]){
                    var partObj = {};
                    Object.defineProperty(obj,part,{configurable: true, value: partObj})
                    obj = partObj;
                }
                else obj = obj[part];
            })
            try {
                var helper = require(file);
                if (typeof helper == "function"){
                    helper = helper(scope);
                }
            }
            catch(e){ deps.logger.exception("Can't run helper "+file,e); }
            Object.defineProperty(obj,helperName,{configurable: true, value: helper})
        }
    }

    var fsExt = deps.utils.fsExt;
    var Q = require("q");
    return function(scope,cfg) {
        var dfd = Q.defer();
        Object.defineProperty(scope, "helpers", {value: {}});
        if (!cfg.path) throw Error("Plugin path is not specified");
        fsExt.tree(cfg.path + "/server/helpers/", function (files) {
            assignHelper(dfd,scope, files, cfg.path + "/server/helpers/");
            dfd.resolve(scope);
        },["/_"]);
        return dfd.promise;
    }
}