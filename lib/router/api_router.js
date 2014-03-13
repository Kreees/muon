var rest = m.sys.require("/controllers/node-orm2/resource.js").run,
    _ = require("underscore"),
    Q = require("q"),
    targetIsModel = require("./api_lib/process_target").targetIsModel,
    targetIsObject = require("./api_lib/process_target").targetIsObject,
    errorize = require("./api_lib/finalize").errorize,
    finalize = require("./api_lib/finalize").finalize
;

var mod = {
    // таргет - по отношению к чему выполняется запрос, это либо модель, либо ее инстанс, либо выборка из коллекции
    // в первом случае мы определяем по тому что model.model == model.
    // инстанс определяется и выборка определяются по обертке.
    //      в этот метод инстанс или выборка могут попасть только в случае, если предыдущий экшн вернул их и он не был последним в рекурсии
    //      process_target должен подобную обертку вернуть.
    getNextObject: function(req,res,target,value,action){
        var dfd = Q.defer();
        var applyF = null;
        if (target instanceof Array){
            var fullNameArr = _.pluck(target,"__fullName__");
            if (_.uniq(fullNameArr).length > 1) _.defer(dfd.reject,[400,"Inconsistent ret array"]);
            else {
                var model = m.getModel(fullNameArr[0]);
                if (!model) {
                    _.defer(dfd.reject,[400,"Wrong model name: "+fullNameArr[0]]);
                    return dfd.promise;
                }
                applyF = targetIsModel;
                req.__queryIds__ = _.pluck(target,"_id");
                req.context.target = req.context.model = model;
                req.context.actionModule = target.actionModule;
                target = model;
            }
        }
        else if (target.model && (target.__fullName__ == (target.__pluginName__? target.__pluginName__+":":"")+target.__modelName__)){
            applyF = targetIsObject;
        }
        else if (target.model && target.model == target.model.model){
            applyF = targetIsModel;
        }
        else _.defer(dfd.reject,[404,"Wrong API request"]);
        if (applyF) applyF(dfd,req,res,target,value,action)
        return dfd.promise;
    },
    // Формирует контект запроса
    // Определяет базовую модель (с которой начинается обработка запроса)
    // Запускает рекурсию.
    run: function(req,res){
        delete req.query.__uniq__;
        req.context = {
            actionModule: null,
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
            // Условие учитывает, что токен может быть пустой, если запрашивается непосредственно индекс модели (тогда token.length изначально будет равен нулю)
            if (target != model && tokens.length == 0){
                return finalize(req,res,target);
            }
            mod.getNextObject(req,res,target,tokens.shift(),tokens.length?"get":targetAction)
                .then(getTarget,_.partial(errorize,req,res)).done();
        }

        getTarget(model);
    }
}

module.exports = mod;