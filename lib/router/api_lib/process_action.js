function isEmpty(obj){ for(var i in obj) return false; }

module.exports = {
    doAction: function (dfd,req,res,actionModule,action,target,value)
    {
        try {
            /// TODO Get compiled where condition
//            req.__compiledWhere__ = actionModule.where || {};
//            if (_.isFunction(req.__compiledWhere__)){
//                req.context.m = req.context.plugin = m.__plugins[req.context.actionModule.pluginName];
//                try {
//                    req.__compiledWhere__ = req.__compiledWhere__.call(req.context,req,res);
//                }
//                catch(e){
//                    dfd.reject([500,"Where function call error:"+ e.message]);
//                    m.error("Where function call error:"+ e.message);
//                    return;
//                }
//            }
//            m.utils.Q.when(req.__compiledWhere__).then(function(where){
//                var result;
//                req.__compiledWhere__ = where;
//                if (isEmpty(req.__compiledWhere__)) req.__compiledWhere__ = {_id: {$nin: []}};
//                if(req.__queryIds__ instanceof Array) req.__compiledWhere__ = {$and: [{_id: {$in:req.__queryIds__}}, req.__compiledWhere__]};
//                if(req.__queryIds__ instanceof Array && value && req.__queryIds__.filter(function(id){return id.toString() == value;}).length == 0)
//                    result = null;
//                else{
                    try{
                        req.context.m = req.context.plugin = m.__plugins[req.context.actionModule.pluginName];
                        result = actionModule.actions[action].call(req.context,req,res,value);
                    }
                    catch(e){
                        m.error(e);
                        return dfd.reject([500,"Exception in action: "
                            + e.message+". Action module: "+actionModule.modulePath
                            +", action: "+action]);
                    }
//                }
                var timeout = setTimeout(function(){
                    dfd.reject([408,"Request timeout"]);
                },30000);
                var promiseFlag = false;
                if (result && result.__proto__ === m.utils.Q.defer().promise.__proto__) promiseFlag = true;
                    m.utils.Q.when(result).then(function(obj){
                    clearTimeout(timeout);
                    if (res.__endEnvoked__ === true) return dfd.reject([0,""]);
                    try{
                        if (["get","create","edit","remove"].indexOf(action.toLowerCase()) != -1){
                            if (obj == null) return dfd.reject([500,"Action "+action+" supposes model object to return"]);
                            if (obj.__fullName__ != target.model.fullName) return dfd.reject([500,"REST actions suppose target model object to return"]);;
                        }
                        if (action.toLowerCase() == 'index') {
                            if (obj == null) return dfd.reject([500,"Action "+action+" supposes array of model objects to return"]);
                        }
                        dfd.resolve(obj)
                    }
                    catch(e){
                        m.error(e);
                        dfd.reject([500,"Internal error: "+ e.message]);

                    }
                },dfd.reject);
//            })
        }
        catch(e){
            _.defer(dfd.reject,"Internal server error: "+ e.toString());
            m.error(e);
        }
    }
}