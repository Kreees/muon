var rest = require(global.m.__syspath+"/lib/controllers/rest.js").run,
    _ = require("underscore"),
    Q = require("q")
;

function checkPermissions(allowedActions,controller,action){
    var checkDfd = Q.defer();
    if (!_.isArray(allowedActions))
        _.defer(checkDfd.reject,[500,"Permission check error: permission should be an array of actions"]);
    else if ((allowedActions.indexOf("all") == -1) && (allowedActions.indexOf(action) == -1))
        _.defer(checkDfd.reject,[403,"Action '"+action+"' is not allowed"]);
    else if (!(action in controller.actions))
        _.defer(checkDfd.reject,[404,"Action '"+action+"' is not available"]);
    else _.defer(checkDfd.resolve);
    return checkDfd.promise;
}

function getPermissions(permissions,req){
    var getDfd = Q.defer();
    if (permissions === undefined) _.defer(getDfd.resolve,["all"]);
    else if (_.isFunction(permissions)){
        req.context.m = req.context.plugin = m.__plugins[req.context.controller.pluginName];
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

function runDependencies(dfd,target,req,res,next){
    if (req.context.middleware.indexOf(target.modelName) != -1) return next();
    var deps = (target.controller.dependencies || []).slice();
    req.context.middleware.push(target.modelName);
    var nativeModel = req.context.model;
    function run(){
        if (deps.length == 0){
            if (typeof target.model.middleware == "function"){
                req.context.m = req.context.plugin = m.__plugins[target.model.pluginName];
                req.context.model = target.model;
                try {
                    return target.model.middleware.apply(req.context,[req,res,function(){
                        req.context.model = nativeModel;
                        _.defer(next);
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
        else  var plug_models = m.__plugins[target.model.pluginName].models;

        if (!(dependencyName in plug_models))
            m.kill("Model dependency '"+dependencyName+"' in plugin '"+target.model.pluginName+"' doesn't exist.")

        runDependencies(dfd,plug_models[dependencyName],req,res,run);
    }
    run();
}

function isEmpty(obj){
    for(var i in obj) return false;
}

function doAction(dfd,req,res,controller,action,target,value){
    try {
        req.__compiledWhere__ = controller.where || {};
        if (_.isFunction(req.__compiledWhere__)){
            req.context.m = req.context.plugin = m.__plugins[req.context.controller.pluginName];
            try {
                req.__compiledWhere__ = req.__compiledWhere__.call(req.context,req,res);
            }
            catch(e){
                dfd.reject([500,"Where function call error:"+ e.message]);
                m.error("Where function call error:"+ e.message);
                return;
            }
        }
        Q.when(req.__compiledWhere__).then(function(where){
            var result;
            req.__compiledWhere__ = where;
            if (isEmpty(req.__compiledWhere__)) req.__compiledWhere__ = {_id: {$nin: []}};
            if(req.__queryIds__ instanceof Array) req.__compiledWhere__ = {$and: [{_id: {$in:req.__queryIds__}}, req.__compiledWhere__]};
            if(req.__queryIds__ instanceof Array && value && req.__queryIds__.filter(function(id){return id.toString() == value;}).length == 0)
                result = null;
            else{
                try{
                    req.context.m = req.context.plugin = m.__plugins[req.context.controller.pluginName];
                    result = controller.actions[action].call(req.context,req,res,value);
                }
                catch(e){
                    m.error(e);
                    return dfd.reject([500,"Internal server error: "+ e.message]);
                }
            }
            var timeout = setTimeout(function(){
                dfd.reject([408,"Request timeout"]);
            },30000);
            Q.when(result).then(function(obj){
                clearTimeout(timeout);
                if (res.__endEnvoked__ === true) return dfd.reject([0,""]);
                try{
                    if (obj == null) return dfd.reject([404,"Not found"]);
                    var _obj = obj;
                    if (obj.model && obj.model.model == obj.model && target.model != obj.model){
                        target = obj.model;
                        controller = target.model.controller;
                    };
                    if (obj.__querySet__){ _obj = obj; }
                    else if (obj instanceof Array) {
                        _obj = new m.QuerySet(target.model,obj);
                        _obj.controller = controller;
                    }
                    else if (!(obj instanceof target.model)) _obj = new target.model(obj);
                    dfd.resolve(_obj)
                }
                catch(e){
                    m.error(e);
                    dfd.reject([500,"Internal error: "+ e.message]);

                }
            }
            ,dfd.reject);
        })
    }
    catch(e){
        _.defer(dfd.reject,"Internal server error: "+ e.toString());
        m.error(e);
    }
}

function targetIsModel(dfd,req,res,value,action,target){
    var controller = null;
    if (target.model.scopes && value in target.model.scopes){
        target = target.model.scopes[value];
        value = null;
    }
    else if (target.model.objects && value in target.model.objects)
        target = target.model.objects[value];
    controller = target.controller;
    action = (action == "get" && !value)?"index":action;
    if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
        if (target.permissions.indexOf(action) == -1){
            return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
        }
    }
    if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
        return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"]);
    }

    req.context.controller = controller;
    req.context.target = target;
    req.context.action = action;
    req.context.model = target.model;
    req.context.value = value;
    req.context.id = value;
    runDependencies(dfd,target,req,res,function(){
        if(req.context.permissions.indexOf(target.model.modelName) != -1)
            return doAction(dfd,req,res,controller,action,target,value);
        req.context.permissions.push(target.model.modelName)
        getPermissions(controller.permissions,req)
            .then(function(permissions){
                checkPermissions(permissions,controller,action)
                    .then(function(){
                        doAction(dfd,req,res,controller,action,target,value);
                    },dfd.reject).done()
            },dfd.reject).done()
    });
}

function targetIsObject(dfd,req,res,value,action,target){
    var controller = null;
    if (target.scopes && value in target.scopes){
        controller = target.scopes[value].controller;
        value = null;
    }
    else controller = target.controller;
    action = (action == "get" && !value)?"index":action;
    if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
        if (target.permissions.indexOf(action) == -1){
            return _.defer(dfd.reject,[403,"Action '"+action+"' is not allowed"])
        }
    }
    if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
        return _.defer(dfd.reject,403,["Action '"+action+"' is not allowed"])
    }

    req.context.controller = controller;
    req.context.target = target;
    req.context.action = action;
    req.context.model = target.model;
    runDependencies(dfd,target.model,req,res,function(){
        if(req.context.permissions.indexOf(target.model.modelName) != -1) return doAction();
        req.context.permissions.push(target.model.modelName)
        getPermissions(target.permissions,req)
            .then(function(permissions){
                checkPermissions(permissions,controller,action)
                    .then(function(){
                        getPermissions(controller.permissions,req)
                            .then(function(permissions){
                                checkPermissions(permissions,controller,action)
                                    .then(function(){
                                        doAction(dfd,req,res,controller,action,target,value);
                                    },dfd.reject).done();
                            },dfd.reject).done();
                    },dfd.reject).done();
            },dfd.reject).done();
    });
}

function getNextObject(req,res,value,action,target){
    var dfd = Q.defer();
    var applyF = null;
    if (target.__querySet__){
        applyF = targetIsModel;
        target.controller = req.context.controller;
        req.__queryIds__ = target.slice();
    }
    else
        if (target instanceof target.model){
            applyF = targetIsObject;
        }
        else {
            applyF = targetIsModel;
        }
    applyF(dfd,req,res,value,action,target)
    return dfd.promise;
}

function decorateObj(obj,d,t){
    if (!d) return obj;
    var newObject = {};
    for(var i in d){
        if (d[i] in obj) newObject[d[i]] = obj[d[i]];
    }
    if (d.length > 0) newObject._id = obj._id;
    return newObject;
}

function decorate(obj,d,t){
    if (obj instanceof Array) return obj.map(function(a){return decorateObj(a,d,t)});
    else return decorateObj(obj,d,t);
}

function finalize(req,res,target){
    if (res.__endEnvoked__) return;
    res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    function send(obj){
        try{
            if (m.cfg.serverMode == "development") return res.end(JSON.stringify(obj));
            var d = req.context.decorator || req.context.controller.decorator || req.context.model.controller.decorator;
            if (!d) return res.end(JSON.stringify(obj));
            if (typeof d != "function") return res.end(JSON.stringify(decorate(obj,d,target)));
            Q.when(d()).then(function(d){
                res.end(JSON.stringify(decorate(obj,d,target)));
            },function(){
                res.statusCode = 500;
                res.end("Object decoration fail ");
            }).done()
        }
        catch(e){
            console.log(e.stack);
            res.end("");
        }


    }
    if (target.__querySet__){
        send(target.evalRaw());
    }
    else if (target instanceof Array){
        send(target.map(function(a){
            return (_.isObject(a.attributes)? a.attributes:a)
        }));
    }
    else {
        send(_.isObject(target.attributes)? target.attributes:target);
    }
}

 function errorize(req,res,error){
    var status,data;
    if (isNaN(parseInt(error[0]))) { status = 500; data = error[0]; }
    else { status = error[0]; data = error[1]; }
    if (status == 500) m.error(data);
    res.writeHead(status, {"Content-Type": "application/json"});
    res.end(JSON.stringify({
        statusCode:status,
        targetName:req.context.target.modelName,
        error: data
    }));
}

module.exports = function(req,res){
    req.context = {
        controller: null,
        target: null,
        action: null,
        model: null,
        middleware: [],
        permissions: [],
        plugin: [],
        data: {}
    };
    var endReponse = res.end;
    res.end = function(){
        res.__endEnvoked__ = true;
        endReponse.apply(this,arguments);
    }
    var targetAction = null;
    delete req.query.__uniq__;
    if(req.method == "GET") targetAction = "get"
    if(req.method == "POST") targetAction = "create";
    if(req.method == "PUT") targetAction = "edit";
    if(req.method == "DELETE") targetAction = "remove";


    var path = decodeURI(unescape(req.path));

    var tokens = _.compact(path.split(/\//));
    var baseToken = tokens.shift();
    var plugin = m;
    var pluginStack = baseToken.split(":");
    baseToken = pluginStack.pop();

    for(var i in pluginStack) {
        if (pluginStack[i] in plugin.plugins) plugin = plugin.plugins[pluginStack[i]];
        else return errorize(req,res,"Unknown plugin name");
    }
    if (!(baseToken in plugin.urlAccess)){
        return errorize(req,res,"Unknown target request");
    }
    req.context.plugin = plugin;
    req.context.m = plugin;
    var model = plugin.urlAccess[baseToken];
    if (req.query.__action__){
        targetAction = req.query.__action__;
        delete req.query.__action__;
    }

    if (req.method == "GET") req.context.data = req.query;
    else req.context.data = req.body;

    function getTarget(target){
        if (target != model && tokens.length == 0){
            return finalize(req,res,target);
        }
        getNextObject(req,res,tokens.shift(),tokens.length?"get":targetAction,target)
            .then(getTarget,_.partial(errorize,req,res)).done();
    };
    getTarget(model);
}