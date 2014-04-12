function PlainController(){}

PlainController.prototype = {
    extend: function(extension){
        var newObject = new this.constructor();
        m.utils._.extend(newObject,this);
        newObject.actions =  m.utils._.clone(this.actions || {});
        newObject.dependencies =  (newObject.dependencies || []).map(function(a){
            var plName = newObject.pluginName;
            return (plName?plName+":":"")+a;
        });
        newObject.pluginName = "";
        for(var i in extension){
            if (["extend"].indexOf(i) != -1) continue;
            switch(i){
                case "actions": m.utils._.extend(newObject.actions,extension.actions); break;
                case "dependencies": newObject[i] = newObject[i].concat(extension[i]); break;
                default: newObject[i] = extension[i];
            }
        }
        newObject.super = this;
        newObject.extend = this.extend;
        return newObject;
    }
}

module.exports = new PlainController();