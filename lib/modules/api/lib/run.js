module.exports = function(self,deps){
    var _ = require("underscore"),
        Q = require("q"),
        targetProc = self.require("lib/target"),
        fin = self.require("lib/finalize")
    ;

    function getNextObject(req,res,target,value,action){
        var applyF = null;
        if (deps.models.isModel(target)){
            applyF = targetProc.isModel;
        } else if (deps.models.isModelInstance(target)){
            applyF = targetProc.isObject;
        } else if (deps.models.isModelInstanceArray(target)){
            var model = target[0].model();
            applyF = targetProc.isModel;
            req.__queryIds__ = _.pluck(target,"_id");
            req.context.model = model;
            target = model;
        }
        else throw [404,"Wrong API request"];
        return applyF(req,res,target,value,action);
    }

    return function(req,res){
        delete req.query.__uniq__;
        req.context = {
            model: null,
            name: null,
            id: null,
            app: null,
            data: {}
        };

        var resEndInvoked = false;

        var endReponse = res.end;

        res.end = function(){
            if (resEndInvoked){
                deps.logger.error("response.end() was already invoked");
                return;
            }
            res.emit("clear");
            resEndInvoked = true;
            endReponse.apply(this,arguments);
        }
        Object.defineProperty(res,"endInvoked",{get: function(){return resEndInvoked;}});
        Object.defineProperty(res,"request",{value: req});

        var targetAction = null;

        if(req.method == "GET") targetAction = "get"
        if(req.method == "POST") targetAction = "create";
        if(req.method == "PUT") targetAction = "edit";
        if(req.method == "DELETE") targetAction = "remove";

        var path = decodeURI(unescape(req.path));

        var tokens = _.compact(path.split(/\//));
        var targetToken = tokens.shift();
        var model = deps.models.getModel(targetToken);
        if (!model) return fin.errorize(req,res,[404,"Unknown target name"]);
        if (!model.accessible) return fin.errorize(req,res,[403,"Access to this target is prohibited"]);


//        res.writeHead(200,{'content-type':'application/json'});
//        return res.end(JSON.stringify({name: model.fullName}));

        req.context.app = deps.plugins.getPlugin(model.pluginName);

        if (req.query.__action__){
            targetAction = req.query.__action__;
            delete req.query.__action__;
        }

        if (req.method == "GET") req.context.data = req.query;
        else req.context.data = req.body;


        function getTarget(target){
            // Условие учитывает, что токен может быть пустой, если запрашивается непосредственно индекс модели (тогда token.length изначально будет равен нулю)
            if (target != model && tokens.length == 0){
                return fin.finalize(req,res,target);
            }
            getNextObject(req,res,target,tokens.shift(),tokens.length?"get":targetAction)
                .then(getTarget,_.partial(fin.errorize,req,res)).done();
        }

        getTarget(model);
    }
}