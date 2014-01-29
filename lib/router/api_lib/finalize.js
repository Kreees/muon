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

function baseSerializer(obj,fullName){
    var model;
    if (!fullName) {
        if (obj instanceof Array && obj[0]) fullName == obj[0];
        else fullName = obj.__fullName__;
    }
    if (!fullName) return obj;
    else model = m.getModel(fullName);
    if (!model) return obj;
    var attrList = m.utils._.keys(model.allProperties);
    if (obj instanceof Array) return obj.map(function(obj){
        return serializeObj(obj,attrList,model.hasOneRelations,model.hasManyRelations,[]);
    });
    else return serializeObj(obj,attrList,model.hasOneRelations,model.hasManyRelations,[]);
}

function finalize(req,res,result){
    if (res.__endEnvoked__) return result;
    res.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    try{
        if (["get","edit","remove","create","index","search"].indexOf(req.context.action.toLowerCase()) != -1)
            result = baseSerializer(result,req.context.target.model.fullName);
        else result = baseSerializer(result);
        if (typeof result != "object") throw Error("Result should be an object or array");
        if (m.cfg.serverMode == "development") return res.end(JSON.stringify(result));
        var serializer = req.context.serializer || req.context.controller.serializer;
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
    catch(e){ errorize(req,res,[500,e.message]); }
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
    if (error instanceof Array){
        if (isNaN(parseInt(error[0]))) { status = 500; data = error[0]; }
        else { status = error[0]; data = error[1]; }
        if (status == 500) m.error(data);
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
                ret.controller = ctx.result.controller?req.context.result.controller.modulePath:"unknown";
        }
        res.end(JSON.stringify(ret));
    }
    else {
        var ret = {};
        ret.statusCode = error.statusCode || 500;
        ret.data = error.data || "Unknown error";
        res.writeHead(ret.statusCode, {"Content-Type": "application/json"});
        res.end(JSON.stringify(ret));
    }
}

module.exports = {
    finalize: finalize,
    errorize: errorize
}