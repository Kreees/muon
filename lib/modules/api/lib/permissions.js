module.exports = function(self,deps){
    var _ = require("underscore"),
        Q = require("q");

    function getPermission(controller,req,res,name){
        var getDfd = Q.defer();
        var permissions = controller.permissions;
        if (permissions === undefined) return ["all"];
        else if (_.isFunction(permissions)){
            req.context.app = deps.plugins.getPlugin(controller.pluginName);
            try{
                Q.when(permissions.call(req.context,req,res,name)).then(function(resolved){
                    if (typeof resolved == "string"){
                        if (resolved.toLowerCase() == "none") return getDfd.resolve([]);
                        if (resolved.toLowerCase() == "all") return getDfd.resolve(["all"]);
                        return getDfd.reject();
                    }
                    getDfd.resolve(resolved);
                },function(e){
                    _.defer(getDfd.reject,[500,"Permission check exception: "+ e.message,e]);
                }).done();
            }
            catch(e){;
                return _.defer(getDfd.reject,[500,"Permission check exception: "+ e.message,e]);
            };
        }
        else if (_.isArray(permissions)){
            _.defer(getDfd.resolve,permissions);
        }
        else if (typeof permissions == "string"){
            if (permissions.toLowerCase() == "none") _.defer(getDfd.resolve,[]);
            else
            if (permissions.toLowerCase() == "all") _.defer(getDfd.resolve,["all"]);
            else _.defer(getDfd.reject,"Permission check error");
        }
        else throw Error("Permission check error");
        return getDfd.promise;
    }

    return function(controller,req,res,name,action){
        return Q([controller,req,res,name]).spread(getPermission)
            .then(function(allowedActions){
                if (!(allowedActions instanceof Array))
                    throw [500,"Permission check error: permission should be an array of actions"];
                else if ((allowedActions.indexOf("all") == -1) && (allowedActions.indexOf(action) == -1))
                    throw [403,"Action '"+action+"' is not allowed"];
                else if (!(action in controller.actions))
                    throw [404,"Action '"+action+"' is not available"];
                else return;
            });
    }
}
