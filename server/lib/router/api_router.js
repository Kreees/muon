var rest = require(global.m.__sys_path+"/server/lib/controllers/rest.js").run,
    _ = require("underscore"),
    Q = require("q")
;

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
        req.context.m = req.context.plugin = m.__plugins[req.context.controller.plugin_name];
        Q.when(permissions.call(req.context,req)).then(function(resolved){
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

function run_dependency(target,req,res,next){
    if (req.context.middleware.indexOf(target.model_name) != -1) return next();
    var deps = (target.c.dependencies || []).map(function(a){
        var pl = target.c.plugin_name;
        return (pl?pl+":":+"")+a;
    });
    if (target.model.super) deps.unshift(target.model.extend);
    req.context.middleware.push(target.model_name);
    var native_model = req.context.model;
    function run(){
        if (deps.length == 0){
            if (typeof target.model.m == "function"){
                req.context.m = req.context.plugin = m.__plugins[target.model.plugin_name];
                return target.model.m.apply(req.context,[req,res,function(){
                    req.context.model = native_model;
                    next();
                }]);
            }
            else{
                req.context.model = native_model;
                return next();
            }
        }
        var dep_name = deps.shift();
        try{
            if (dep_name.indexOf(":") != -1){
                var dep_plugin = dep_name.split(":");
                dep_name = dep_plugin.pop();
                dep_plugin = dep_plugin.join(":");
                plug_models = m.__plugins[dep_plugin].models;
            }
            else {
                var plug_models = m.__plugins[target.model.plugin_name].models;
            }
        }
        catch(e){ throw e; }
        if (!(dep_name in plug_models)){
            m.kill("Model dependency '"+dep_name+"' in plugin '"+target.model.plugin_name+"' doesn't exist.")
        }
        run_dependency(plug_models[dep_name],req,res,run);
    }
    run();
}

function is_empty(obj){
    for(var i in obj) return false;
}

function do_action(dfd,req,res,controller,action,target,value){
    try {
        req.__compiled_where__ = controller.where || {};
        if (_.isFunction(req.__compiled_where__)){
            req.context.m = req.context.plugin = m.__plugins[req.context.controller.plugin_name];
            req.__compiled_where__ = req.__compiled_where__.call(req.context,req,res);
        }
        Q.when(req.__compiled_where__).then(function(where){
            req.__compiled_where__ = where;
            if (is_empty(req.__compiled_where__)) req.__compiled_where__ = {_id: {$nin: []}};
            if(req.__query_ids__ instanceof Array) req.__compiled_where__ = {$and: [{_id: {$in:req.__query_ids__}}, req.__compiled_where__]};
            if(req.__query_ids__ instanceof Array && value && req.__query_ids__.filter(function(id){return id.toString() == value;}).length == 0)
                result = null;
            else{
                try{
                    req.context.m = req.context.plugin = m.__plugins[req.context.controller.plugin_name];
                    result = controller.actions[action].call(req.context,req,res,value);
                }
                catch(e){
                    return dfd.reject("Internal server error: "+ e.message);
                }
            }
            Q.when(result).
                then(function(obj){
                    if (res.__end_envoked__ === true) return dfd.reject("");
                    try{
                        if (obj == null) return dfd.reject("Not found");
                        var _obj = obj;
                        if (obj.model && obj.model.model == obj.model && target.model != obj.model){
                            target = obj.model;
                            controller = target.model.c;
                        };
                        if (obj.__query_set__){ _obj = obj; }
                        else if (obj instanceof Array) {
                            _obj = new m.QuerySet(target.model,result);
                            _obj.c = controller;
                        }
                        else {
                            if (!(obj instanceof target.model)){
                                _obj = new target.model(obj);
                            }
                        }
                        dfd.resolve(_obj)
                    }
                    catch(e){
                        dfd.reject("Internal error: "+ e.message);
                    }
                }
                ,dfd.reject);
        })
    }
    catch(e){
        _.defer(dfd.reject,"Internal server error: "+ e.toString());
        console.error(e.stack);
    }
}

function target_is_model(dfd,req,res,value,action,target){
    var controller = null;
    if (target.model.s && value in target.model.s){
        target = target.model.s[value];
        value = null;
    }
    else if (target.model.o && value in target.model.o)
        target = target.model.o[value];
    controller = target.c;
    action = (action == "get" && !value)?"index":action;
    if (_.isArray(target.permissions) && target.permissions.indexOf("all") == -1){
        if (target.permissions.indexOf(action) == -1){
            return; _.defer(dfd.reject,"Action '"+action+"' is not allowed")
        }
    }
    if (typeof target.permissions == 'string' && target.permissions.toLowerCase() == "none"){
        return; _.defer(dfd.reject,"Action '"+action+"' is not allowed")
    }

    req.context.controller = controller;
    req.context.target = target;
    req.context.action = action;
    req.context.model = target.model;
    req.context.value = value;
    req.context.id = value;
    run_dependency(target,req,res,function(){
        if(req.context.permissions.indexOf(target.model.model_name) != -1)
            return do_action(dfd,req,res,controller,action,target,value);
        req.context.permissions.push(target.model.model_name)
        get_permissions(controller.permissions,req)
            .then(function(permissions){
                check_permissions(permissions,controller,action)
                    .then(function(){
                        do_action(dfd,req,res,controller,action,target,value);
                    },dfd.reject)
            },dfd.reject)
    });
}

function target_is_object(dfd,req,res,value,action,target){
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

    req.context.controller = controller;
    req.context.target = target;
    req.context.action = action;
    req.context.model = target.model;
    run_dependency(target.model,req,res,function(){
        if(req.context.permissions.indexOf(target.model.model_name) != -1) return do_action();
        req.context.permissions.push(target.model.model_name)
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
    });
}

function get_next_object(req,res,value,action,target){
    var dfd = Q.defer();
    var apply_f = null;
    if (target.__query_set__){
        apply_f = target_is_model;
        target.c = req.context.controller;
        req.__query_ids__ = target.slice();
    }
    else
        if (target instanceof target.model){
            apply_f = target_is_object;
        }
        else {
            apply_f = target_is_model;
        }
    apply_f(dfd,req,res,value,action,target)
    return dfd.promise;
}

function decorate_obj(obj,d,t){
    if (!d) return obj;
    var new_obj = {};
    for(var i in d){
        if (d[i] in obj) new_obj[d[i]] = obj[d[i]];
    }
    if (d.length > 0) new_obj._id = obj._id;
    return new_obj;
}

function decorate(obj,d,t){
    if (obj instanceof Array) return obj.map(function(a){return decorate_obj(a,d,t)});
    else return decorate_obj(obj,d,t);
}

 function finalize(req,res,target){
    if (res.__end_envoked__) return;
    res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    function send(obj){
        try{
            var d = req.context.decorator || req.context.controller.decorator || req.context.model.c.decorator;
            if (!d) return res.end(JSON.stringify(obj));
            if (typeof d != "function") return res.end(JSON.stringify(decorate(obj,d,target)));
            Q.when(d()).then(function(d){
                res.end(JSON.stringify(decorate(obj,d,target)));
            })
        }
        catch(e){
            console.log(e.stack);
            res.end("");
        }


    }
    if (target.__query_set__){
        send(target.eval_raw());
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

errorize = function(req,res,data){
    res.writeHead(404, {"Content-Type": "application/json"});
    res.end(JSON.stringify({errors: data}));
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

    var end_response = res.end;
    res.end = function(){
        res.__end_envoked__ = true;
        end_response.apply(this,arguments);
    }
    var target_action = null;
    delete req.query.__uniq__;
    if(req.method == "POST") target_action="create";
    if(req.method == "PUT") target_action="edit";
    if(req.method == "DELETE") target_action="delete";
    if(req.method == "GET") target_action="get"

    var path = decodeURI(unescape(req.path));

    var tokens = _.compact(path.split(/\//));
    var base_token = tokens.shift();
    var plugin = m;
    var plugin_stack = base_token.split(":");
    base_token = plugin_stack.pop();

    for(var i in plugin_stack) {
        if (plugin_stack[i] in plugin.plugins) plugin = plugin.plugins[plugin_stack[i]];
        else return errorize(req,res,"Unknown plugin name");
    }
    if (!(base_token in plugin.url_access)){
        return errorize(req,res,"Unknown target request");
    }
    req.context.plugin = plugin;
    req.context.m = plugin;
    var model = plugin.url_access[base_token];
    if (req.query.__action__){
        target_action = req.query.__action__;
        delete req.query.__action__;
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