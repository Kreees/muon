function isEmpty(obj){ for(var i in obj) return false; }

module.exports = {
    doAction: function (dfd,req,res,controller,action,target,value)
    {
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
                        return dfd.reject([500,"Exception in controller action: "
                            + e.message+". Controller: "+controller.modulePath
                            +", action: "+action]);
                    }
                }
                var timeout = setTimeout(function(){
                    dfd.reject([408,"Request timeout"]);
                },30000);
                var promiseFlag = false;
                if (result && result.__proto__ === m.Q.defer().promise.__proto__) promiseFlag = true;

                Q.when(result).then(function(obj){
                    clearTimeout(timeout);
                    if (res.__endEnvoked__ === true) return dfd.reject([0,""]);
                    try{
//
//                        if (["get","create","edit","remove"].indexOf(action.toLowerCase()) == -1){
//                            if (obj == null) dfd.reject([500,"Action "+action+" supposes model object to return"]);
//                            if (obj.fullName != target.model.fullName) dfd.resolve(obj);
//                            return;
//                        }
//                        if (action.toLowerCase() == 'index') {
//                            if (obj == null) dfd.reject([500,"Action "+action+" supposes array of model objects to return"]);
//                            return;
//                        }
//                        if (obj == null) return dfd.resolve();
//
//                        var _obj = obj;
//                        if (obj.model && obj.model.model == obj.model && target.model != obj.model){
//                            target = obj.model;
//                            controller = target.model.controller;
//                        };
//                        if (obj.__querySet__){ _obj = obj; }
//                        else if (obj instanceof Array) {
//                            _obj = new m.QuerySet(target.model,obj);
//                            _obj.controller = controller;
//                        }
//                        else if (!(obj instanceof target.model)) _obj = new target.model(obj);
                        dfd.resolve(obj)
                    }
                    catch(e){
                        m.error(e);
                        dfd.reject([500,"Internal error: "+ e.message]);

                    }
                },dfd.reject);
            })
        }
        catch(e){
            _.defer(dfd.reject,"Internal server error: "+ e.toString());
            m.error(e);
        }
    }
}