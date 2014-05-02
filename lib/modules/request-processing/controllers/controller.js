var _ = require("underscore");

function PlainController(){};

function extend(extension){
    var newObject = new this();

    newObject.actions =  _.clone(this.prototype.actions || {});
    newObject.dependencies =  (newObject.dependencies || []).map(function(a){
        var plName = newObject.pluginName;
        return (plName?plName+":":"")+a;
    });
    newObject.pluginName = "";
    for(var i in extension){
        if (["extend"].indexOf(i) != -1) continue;
        switch(i){
            case "actions": _.extend(newObject.actions,extension.actions); break;
            case "dependencies": newObject[i] = newObject[i].concat(extension[i]); break;
            default: newObject[i] = extension[i];
        }
    }

    newObject.super = this.prototype;
    newObject.extend = arguments.callee.bind(Controller);

    function Controller(){};

    Controller.prototype = newObject;
    Controller.extend = arguments.callee.bind(Controller);
    return Controller;
}

PlainController.prototype = { extend: extend.bind(PlainController) }
PlainController.extend = extend.bind(PlainController);

module.exports = function(){
    return PlainController;
}