/**
 * Model manager - module for declaring models and all related subparts,
 * like ORM/Database, helpers for that utilised by models
 */

module.exports = function(self,deps){
    var models = {};
    /* ModelsNames is important! Provide right order of model definition within the application */
    var modelsNames = [];
    var defineModel = self.require("lib/defineModel");

    var _ = require("underscore");

    return {
        __reload__ : function(){
            for(var i in models) delete models[i];
            models = {};
        },
        initScope: self.require("lib/initScope"),
        defineModel: function(name,descriptor,pluginCfg){
            return defineModel(name,descriptor,pluginCfg).then(function(model){
                modelsNames.push(model.fullName);
                models[model.fullName] = model;
                m.emit("model-defined",model);
                m.emit("model-defined:"+model.fullName,model);
                return model;
            });
        },
        getModel: function(name,plName){
            if (plName) name = plName + ":"+name;
            return models[name];
        },
        getModelsNames: function(){
            return modelsNames.slice();
        },
        modelExists: function(name,plName){
            if (plName) name = plName + ":"+name;
            return (name in models);
        },
        isModel: function(mod){
            if (typeof mod != "function") return false;
            if (!("fullName" in mod)) return false;
            return (models[mod.fullName] == mod);
        },
        isModelInstance: function(inst){
            if (typeof inst != "object") return false;
            if (typeof inst.model != "function") return false;
            var fullName = inst.model().fullName;
            if (!fullName) return false;
            /* Should use fullName because of possible reloading */
            return (models[fullName].fullName == fullName);
        },
        isModelInstanceArray: function(arr){
            if (!(arr instanceof Array)) return false;
            if (arr.length == 0) return false;
            if (self.isModelInstance(arr[0])){
                var model = arr[0].model();
                for(var i = 1, len = arr.length; i < len; i++){
                    /* Should use fullName because of possible reloading */
                    if (arr[i] && (typeof arr[i].model == "function") && (arr[i].model().fullName == model.fullName))
                        continue;
                    return false;
                }
                return true;
            }
            return false;

        },
        ErrorExtendedModelNotDefined: deps.utils.newError("ErrorExtendedModelNotDefined"),
        ErrorModelNotFound: deps.utils.newError("ErrorModelNotFound")
    };
};

