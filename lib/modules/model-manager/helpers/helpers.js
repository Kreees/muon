var fsExt = m.sys.require("/utils/fs/fs_ext");

function assignHelper(scope,files,rootPath){
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
        catch(e){ m.kill(e); }
        Object.defineProperty(obj,helperName,{configurable: true, value: helper})
    }
}

exports.init = function(cfg,pluginScope){
    var dfd = m.utils.Q.defer();
    Object.defineProperty(pluginScope,"helpers",{value: {}});
    if (!cfg.path) m.kill("Plugin path is not specified");
    fsExt.tree(cfg.path+"/server/helpers/common",function(files){
        assignHelper(pluginScope,files,cfg.path+"/server/helpers/common/");
        fsExt.tree(cfg.path+"/server/helpers/"+ m.cfg.serverMode,function(files){
            assignHelper(pluginScope,files,cfg.path+"/server/helpers/"+ m.cfg.serverMode+"/");
            dfd.resolve(pluginScope);
        })
    });
    return dfd.promise;
}