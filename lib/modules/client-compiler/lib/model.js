module.exports = function(self,deps){
    var cfg = deps.config.load();
    var Q = require("q");

    return function(model){
        var defaults = {};
//        for(var j in model.scheme)
//            defaults[j] = (model.scheme[j].defaults !== undefined)?model.scheme[j].defaults:defs[model.scheme[j].type];
        var host = cfg.protocol+"://"+cfg.domain;

        var modelName = model.fullName;

        var scheme = {
            attributes: model.allProperties,
            hasManyRelations: model.hasManyRelations,
            hasOneRelations: model.hasOneRelations
        };

        var backboneModel = {
            plugin: model.pluginName,
            modelName: modelName,
            urlRoot: host+"/api/"+model.fullName,
            defaults: defaults,
            scheme: scheme
        };
        var backboneModelString = "m.Model.extend(";
        backboneModelString += JSON.stringify(backboneModel)+",{scheme: "+JSON.stringify(scheme)+"});";
        return Q(backboneModelString)
    }
}