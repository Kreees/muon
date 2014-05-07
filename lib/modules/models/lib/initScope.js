module.exports = function(self,deps){
    var fsExt = deps.utils.fsExt,
        path = require("path"),
        Q = require("q"),
        _ = require("underscore")
    ;
    return function(cfg){
        var dfd = Q.defer();
        cfg = cfg || deps.config.load();
        var modelsPath = path.normalize(cfg.path+"/server/app/models");
        fsExt.tree(modelsPath,function(files){
            files = files.filter(function(file){ return !file.match(/\/_[a-zA-Z_\d\.]+$/); });
            var scope = {};
            scope = {};
            var postponedModels = [];
            var depsCount = 0;
            var filesLeft = files.length;;
            (function RunCyclic(){
                if (files.length == 0) return dfd.resolve(scope);
                var filePath = files.shift();
                var packagePath = filePath.replace(modelsPath+"/","");
                var fileName = packagePath.substring(packagePath.lastIndexOf("/")+1,packagePath.length).replace(/\.js$/g,"");
                packagePath = packagePath.replace(fileName+".js","").replace(/^\/|\/$/,"").replace(/\//g,".");
                var modelSimpleName = fileName;
                var name = (packagePath?packagePath+".":"")+modelSimpleName;

                if (filesLeft > 0) filesLeft--;

                Q([name,require(filePath),cfg]).spread(self.defineModel).then(function(model){
                    if (postponedModels.indexOf(filePath) == -1)
                        postponedModels = _.without(postponedModels,filePath);
                    Object.defineProperty(model,"modulePath",{value: path.normalize(filePath)});
                    scope[model.modelName] = model;
                    RunCyclic();

                }).catch(function(e){
                    if(e instanceof self.ErrorExtendedModelNotDefined){
                        if (postponedModels.indexOf(filePath) == -1) postponedModels.push(filePath);
                        if (filesLeft == 0 && depsCount >= postponedModels.length)
                            deps.logger.exception("Cyclic models dependency detected.");

                        depsCount = postponedModels.length;
                        files.push(filePath);
                        RunCyclic();
                        return;
                    }

                    if(e instanceof self.ErrorModelNotFound)
                        deps.logger.exception("Can't define model: "+filePath,e);

                    deps.logger.exception(e);
                }).done();
            })();
        });
        return dfd.promise;
    };
};