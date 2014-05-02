module.exports = function(self,deps){
    var rp = deps["request-processing"];
    function runDependencies(model,dependencies,req,res)
    {
        if (!req.context.middleware) req.context.middleware = [];
        if (req.context.middleware.indexOf(model.fullName) != -1) return;
        dependencies = (dependencies || []).slice();
        req.context.middleware.push(model.fullName);
        var nativeModel = req.context.model;
        var nativePlugin = req.context.app;
        function run(){
            if (dependencies.length == 0){
                req.context.app = deps.plugins.getPlugin(model.pluginName);
                req.context.model = model;
                var middlewareMod = rp.getMiddleware(model);
                if (typeof middlewareMod == "function"){
                    if (deps.utils.getPassedArgumentsNumber(middlewareMod) > 2){
                        var dfd = Q.defer();
                        try{
                            middlewareMod.apply(req.context,[req,res,function(){
                                req.context.model = nativeModel;
                                req.context.app = nativePlugin;
                                dfd.resolve();
                            }]);
                        }
                        catch(e){
                            _.defer(dfd.reject,e);
                        }
                        return dfd.promise;
                    }
                    else
                        try{
                            return Q.when(middlewareMod.apply(req.context,[req,res])).then(function(){
                                req.context.model = nativeModel;
                                req.context.app = nativePlugin;
                            });
                        }
                        catch(e){
                            deps.logger.error(e);
                            return Q().then(function(){throw e;});
                        }

                }
                else return Q();
            }
            var dependencyName = dependencies.shift();

            var depModel = deps.models.getModel(dependencyName);
            if (!depModel)
                deps.logger.exception("Model dependency '"+dependencyName+"' doesn't exist.")

            return Q.when(runDependencies(depModel,(rp.getController(depModel).dependencies || []),req,res));
        }
        return run();
    }

    return runDependencies;
}
