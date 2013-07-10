var rest = require(global.m.__sys_path+"/server/lib/controllers/rest.js").run,
    db = require(global.m.__sys_path+"/server/lib/utils/db/database.js"),
    _ = require("underscore"),
    Q = require("q")
;

function get_request_target(value){
    var action = "";
    if (typeof value === "string"){
        if (value.indexOf(".") != -1){
            action = value.split("."); action.splice(0,1);
            action = action.join(".")
            value = value.split(".")[0];
        }
    }
    return {
        value: value,
        action: action
    }
}

function check_permissions(allowed_actions,controller,action){
    var check_dfd = Q.defer();
    if (!_.isArray(allowed_actions))
        _.defer(check_dfd.reject,"Permission check error");
    else if ((allowed_actions.indexOf("all") == -1) && (allowed_actions.indexOf(action) == -1))
        _.defer(check_dfd.reject,"Action '"+action+"' is not allowed");
    else if (!(action in controller.actions))
        _.defer(check_dfd.reject,"Action '"+action+"' is not available");
    else _.defer(check_dfd.resolve);
    return check_dfd.promise;
}

function get_permissions(permissions,req){
    var get_dfd = Q.defer();
    if (permissions === undefined) _.defer(get_dfd.resolve,["all"]);
    else if (_.isFunction(permissions)){
        Q.when(permissions(req)).then(function(resolved){
            if (typeof resolved == "string"){
                if (resolved.toLowerCase() == "none") return get_dfd.resolve([]);
                if (resolved.toLowerCase() == "all") return get_dfd.resolve(["all"]);
                return get_dfd.reject("Permission check error");
            }
            get_dfd.resolve(resolved);
        },get_dfd.reject);
    }
    else if (_.isArray(permissions)){
        _.defer(get_dfd.resolve,permissions);
    }
    else if (typeof permissions == "string"){
        if (permissions.toLowerCase() == "none") _.defer(get_dfd.resolve,[]);
        else
        if (permissions.toLowerCase() == "all") _.defer(get_dfd.resolve,["all"]);
        else _.defer(get_dfd.reject,"Permission check error");
    }
    else _.defer(get_dfd.reject,"Permission check error");
    return get_dfd.promise;
}

function do_action(dfd,req,res,controller,action,target,value){
    function run(){
        try {
            req.context = {
                controller: controller,
                target: target,
                action: action
            }
            var result = controller.actions[action].call(target.model,req,res,value);
            if (result == null) return _.defer(dfd.reject,"Not found");
            Q.when(result).
                then(function(obj){
                    var _obj = obj;
                    if (obj instanceof Array) {
                        _obj = new db.QuerySet(target.model);
                        _obj.push.apply(_obj,obj);
                        _obj.c = controller;
                    }
                    else {
                        if (!(obj instanceof target.model))
                            _obj = new target.model(obj);
                    }
                    dfd.resolve(_obj)}
                ,dfd.reject);
        }
        catch(e){
            _.defer(dfd.reject,"Internal server error: "+ e.toString());
            console.error(e.stack);
        }
    }
    if (typeof target.model.m == "function") target.model.m(req,res,run);
    else run();
}

function target_is_model(dfd,req,res,value,action,target){
    var controller = null;
    if (target.s && value in target.s){
        controller = target.s[value].c;
        value = null;
    }
    else controller = target.c;
    action = (action == "get" && !value)?"index":action;
    if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
        if (target.permissions.indexOf(action) == -1){
            return; _.defer(dfd.reject,"Action '"+action+"' is not allowed")
        }
    }
    if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
        return; _.defer(dfd.reject,"Action '"+action+"' is not allowed")
    }

    get_permissions(target.permissions,req)
        .then(function(permissions){
            check_permissions(permissions,controller,action)
        .then(function(){
    get_permissions(controller.permissions,req)
        .then(function(permissions){
            check_permissions(permissions,controller,action)
                .then(function(){
                    do_action(dfd,req,res,controller,action,target,value);
    },dfd.reject)
    },dfd.reject)
    },dfd.reject)
    },dfd.reject);
}

get_next_object = function(req,res,value,action,target){
    var dfd = Q.defer();
    var apply_f = null;
    if (target instanceof target.model){
        _.defer(dfd.reject,"Query passing through objects is not implemented yet");
    }
    else if (target instanceof db.QuerySet) apply_f = target_is_model;
    else apply_f = target_is_model;
    apply_f(dfd,req,res,value,action,target)
    return dfd.promise;
}

finalize = function(req,res,target){
    res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    var ret = null;
    if (target instanceof Array){
        ret = [];
        for(var i in target.slice()){
            if (_.isObject(target[i].attributes)) ret.push(target[i].attributes);
            else ret.push(target[i]);
        }
    }
    else {
        if (target.attributes) ret = target.attributes;
        else ret = target;
    }
    res.end(JSON.stringify(ret));
}

errorize = function(req,res,data){
    res.writeHead(404, {"Content-Type": "application/json"});
    res.end(JSON.stringify({errors: data}));
}

module.exports = function(req,res){
    var target_action = null;
    if(req.method == "POST") target_action="create";
    if(req.method == "PUT") target_action="edit";
    if(req.method == "DELETE") target_action="delete";
    if(req.method == "GET") target_action="get"

    var path = decodeURI(req.path);

    var tokens = _.compact(path.split(/\//));
    var base_token = tokens.shift();
    var plugin = global.m;
    var plugin_stack = base_token.split(":");
    base_token = plugin_stack.pop();
    for(var i in plugin_stack) {
        if (plugin_stack[i] in plugin.plugins) plugin = plugin.plugins[plugin_stack[i]];
        else return errorize(req,res,"Unknown plugin name");
    }
    if (!(base_token in plugin.url_access)){
        return errorize(req,res,"Unknown target request");
    }

    var model = plugin.url_access[base_token];
    if (req.query._action_){
        target_action = req.query._action_;
        delete req.query._action_;
    }

    function get_target(target){
        if (target != model && tokens.length == 0){
            return finalize(req,res,target);
        }
        get_next_object(req,res,tokens.shift(),tokens.length?"get":target_action,target)
            .then(get_target,_.partial(errorize,req,res));
    };
    get_target(model);
}