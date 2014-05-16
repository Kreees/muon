module.exports = function(self,deps){
    /**
     *
     * @param req - request
     * @param res - response
     * @param result - object or array to decorate
     */

    var serialize = require("./serializer").serialize;
    var Q = require("q");

    function serializeObj(obj,attrList,hasOne,hasMany,filters){
        var ret = {};
        for(var i = 0, len = attrList.length; i < len; i++){
            ret[attrList[i]] =  obj[attrList[i]];
        };
        return ret;
    }

    function baseSerializer(obj,model){
        var attrList = m.utils._.keys(model.allProperties);
        if (obj instanceof Array) return obj.map(function(obj){
            return serializeObj(obj,attrList,model.hasOneRelations,model.hasManyRelations,[]);
        });
        else return serializeObj(obj,attrList,model.hasOneRelations,model.hasManyRelations,[]);
    }

    function finalize(req,res,result){
        if (res.endInvoked) return;
        if (result === null || result === undefined) return errorize(req,res,[404,"Not found"]);
        res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
        try{
            if (result === null || typeof result != "object") throw Error("Result should be an object or array");
            if (!req.context.model.isInstance(result)) return res.end(JSON.stringify(result));
            result = baseSerializer(result,req.context.model);
            if (m.cfg.serverMode == "development") return res.end(JSON.stringify(result));
            var serializer = req.context.serializer || req.context.actionModule.serializer;

            if (!serializer) return res.end(JSON.stringify(result));
            if (typeof serializer != "function") return res.end(JSON.stringify(serialize(result,serializer)));

            Q.when(serializer.apply(req.context,[req,res,result])).then(
                function(serializer){
                    res.end(JSON.stringify(serialize(obj,serializer)));
                },
                function(){
                    res.statusCode = 500;
                    res.end("Object decoration fail ");
                }).done()
        }
        catch(e){
            errorize(req,res,[500,e.message]);
        }
    }

    /**
     *
     * @param req - request
     * @param res - response
     * @param error - an object
     * @param error[0] - statusCode
     * @param error[1] - error object or message
     */



    function errorize(req,res,error){
        var status,data;
        if (!error || typeof error != "object") throw Error("Error should be array or object");
        if (_.isArray(error)){
            if (isNaN(parseInt(error[0]))) { status = 500; data = error[0]; }
            else { status = error[0]; data = error[1]; }
        }
        else {
            status = 500;
            data = error;
        }
        if (status == 500) deps.logger.error(data);
        res.writeHead(status, {"Content-Type": "application/json"});
        var ret = {
            statusCode:status,
            data: data || "Unknown error"
        };
        var ctx = req.context;
        if (m.cfg.serverMode != "production"){
            ret.action = ctx.action;
            ret.value = ctx.value;
            if (ctx.result)
                ret.actionModule = ctx.result.actionModule?req.context.result.actionModule.modulePath:"unknown";
        }
        res.end(JSON.stringify(ret));
    }

    return {
            finalize: finalize,
            errorize: errorize
    };
};