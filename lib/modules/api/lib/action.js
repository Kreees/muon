module.exports = function(self,deps){
    var Q = require("q");
    return function (req,res,controller,action,target,value)
    {
        var dfd = Q.defer();
        var timeout = setTimeout(function(){
            dfd.reject([408,"Request timeout"]);
        },30000);
        Q.when(controller.actions[action].call(req.context,req,res,value)).then(function(obj){
            clearTimeout(timeout);
            if (res.endInvoked === true) return;
            if (obj !== null && obj !== undefined){
                if (["get","create","edit","remove"].indexOf(action.toLowerCase()) != -1){
                    if (!deps.models.isModelInstance(obj)) return dfd.reject([500,"REST actions suppose target model object (or null/undefined when not found) to return"]);;
                }
                else if (action.toLowerCase() == 'index') {
                    if (obj.length && !deps.models.isModelInstanceArray(obj)) return _.defer(dfd.reject,[500,"Action "+action+" supposes array of model objects to return"]);
                }
            }
            dfd.resolve(obj)
        },dfd.reject).done();
        return dfd.promise;
    }
}