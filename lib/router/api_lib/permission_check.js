var rest = m.sys.require("/controllers/resource.js").run,
    _ = require("underscore"),
    Q = require("q");

module.exports = {
    checkPermissions: function(allowedActions,actionModule,action){
        var checkDfd = Q.defer();
        if (!_.isArray(allowedActions))
            _.defer(checkDfd.reject,[500,"Permission check error: permission should be an array of actions"]);
        else if ((allowedActions.indexOf("all") == -1) && (allowedActions.indexOf(action) == -1))
            _.defer(checkDfd.reject,[403,"Action '"+action+"' is not allowed"]);
        else if (!(action in actionModule.actions))
            _.defer(checkDfd.reject,[404,"Action '"+action+"' is not available"]);
        else _.defer(checkDfd.resolve);
        return checkDfd.promise;
    },
    getPermissions: function(permissions,req){
        var getDfd = Q.defer();
        if (permissions === undefined) _.defer(getDfd.resolve,["all"]);
        else if (_.isFunction(permissions)){
            req.context.m = req.context.plugin = m.__plugins[req.context.actionModule.pluginName];
            try{
                Q.when(permissions.call(req.context,req)).then(function(resolved){
                    if (typeof resolved == "string"){
                        if (resolved.toLowerCase() == "none") return getDfd.resolve([]);
                        if (resolved.toLowerCase() == "all") return getDfd.resolve(["all"]);
                        return getDfd.reject();
                    }
                    getDfd.resolve(resolved);
                },getDfd.reject).done();
            }
            catch(e){
                m.error("Permission check exception: "+ e.message);
                getDfd.reject([500,"Permission check exception: "+ e.message]);
                return;
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
        else _.defer(getDfd.reject,"Permission check error");
        return getDfd.promise;
    }
}