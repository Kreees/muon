module.exports = function(self,deps){
    var fsExt = deps.utils.fsExt,
        path = require("path"),
        Q = require("q"),
        _ = require("underscore")
    ;
    return function(cfg){
        cfg = cfg || deps.config.load();
        var modelsPath = path.normalize(cfg.path+"/server/app/models");
        return fsExt.treePromise(modelsPath).then(function(files){
            files = files.filter(function(file){ return !file.match(/\/_[a-zA-Z_\d\.]+$/); });
            var scope = {};
            var postponedModels = [];
            var depsCount = 0;
            var filesLeft = files.length;

            var promise = Q();
            files.reduce(function(p,filePath){
                var packagePath = filePath.replace(modelsPath+"/","");
                var fileName = packagePath.substring(packagePath.lastIndexOf("/")+1,packagePath.length).replace(/\.js$/g,"");
                packagePath = packagePath.replace(fileName+".js","").replace(/^\/|\/$/,"").replace(/\//g,".");
                var modelSimpleName = fileName;
                var name = (packagePath?packagePath+".":"")+modelSimpleName;

                if (filesLeft > 0) filesLeft--;

                return p.then(_.partial(self.defineModel,name,require(filePath),cfg).bind(self)).then(function(model){
                    if (postponedModels.indexOf(filePath) == -1)
                        postponedModels = _.without(postponedModels,filePath);
                    Object.defineProperty(model,"modulePath",{value: path.normalize(filePath)});
                    scope[model.modelName] = model;
                }).catch(function(e){
                    if(e instanceof self.ErrorExtendedModelNotDefined){
                        if (postponedModels.indexOf(filePath) == -1) postponedModels.push(filePath);
                        if (filesLeft == 0 && depsCount >= postponedModels.length)
                            deps.logger.exception("Cyclic models dependency detected.");

                        depsCount = postponedModels.length;
                        files.push(filePath);
                        return;
                    }
                    if(e instanceof self.ErrorModelNotFound)
                        deps.logger.exception("Can't define model: "+filePath,e);
                    deps.logger.exception(e);
                });
            },promise);

            return promise.then(function(){
               return scope;
            });
        });
    };
};