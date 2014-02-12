var rest = m.__require__("/controllers/resource.js").run,
    _ = require("underscore"),
    Q = require("q"),
    targetIsModel = require("./api_lib/process_target").targetIsModel,
    targetIsObject = require("./api_lib/process_target").targetIsObject,
    errorize = require("./api_lib/finalize").errorize,
    finalize = require("./api_lib/finalize").finalize
;

function getNextObject(req,res,value,action,target){
    var dfd = Q.defer();
    var applyF = null;
    if (target instanceof Array){
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

module.exports = function(req,res){
    req.context = {
        controller: null,
        target: null,
        action: null,
        model: null,
        name: null,
        id: null,
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
    var targetToken = tokens.shift();
    var model = m.getModel(targetToken);
    if (!model) return errorize(req,res,[404,"Unknown target name"]);
    if (!model.accessible) return errorize(req,res,[403,"Access to this target is prohibited"]);

    var plugin = m.__plugins[model.pluginName];

    req.context.plugin = plugin;
    req.context.m = plugin;

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