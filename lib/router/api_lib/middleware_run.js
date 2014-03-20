function runDependencies(dfd,target,req,res,next)
{
    if (req.context.middleware.indexOf(target.modelName) != -1) return next();
    var deps = (target.actionModule.dependencies || []).slice();
    req.context.middleware.push(target.modelName);
    var nativeModel = req.context.model;
    function run(){
        if (deps.length == 0){
            if (typeof target.model.middleware == "function"){
                req.context.app = m.__plugins[target.model.pluginName];
                req.context.model = target.model;
                try {
                    return target.model.middleware.apply(req.context,[req,res,function(){
                        req.context.model = nativeModel;
                        m.utils._.defer(next);
                    }]);
                }
                catch(e){ dfd.reject([500,"Middleware exception: "+ e.message+" on target '"
                    +target.modelName
                    +"' (scope: "+(target.scopeName||"null")+")"
                    +"' (object: "+(target.objectName||"null")+")"]); }
                return;
            }
            else{
                req.context.model = nativeModel;
                return next();
            }
        }
        var dependencyName = deps.shift();
        if (dependencyName.indexOf(":") != -1){
            var dep_plugin = dependencyName.split(":");
            dependencyName = dep_plugin.pop();
            dep_plugin = dep_plugin.join(":");
            plug_models = m.__plugins[dep_plugin].models;
        }
        else{
//            console.log(target.model);
            var plug_models = m.__plugins[target.model.pluginName].models;
        }

        if (!(dependencyName in plug_models))
            m.kill("Model dependency '"+dependencyName+"' in plugin '"+target.model.pluginName+"' doesn't exist.")

        runDependencies(dfd,plug_models[dependencyName],req,res,run);
    }
    run();
}

module.exports = {
    runDependencies: runDependencies
};