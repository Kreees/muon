module.exports = function(self,deps){
    var _ = require("underscore");
    var Q = require("q");
    var path = require("path");

    var descriptors = {};

    function isInstance(obj){
        if (typeof obj != 'object') return false;
        if (obj instanceof Array )
            if (obj.length == 0) return true;
            else obj = obj[0];
        return (obj.model && obj.model() == this);
    };

    function finalExtendByDescriptor(model,descriptor){
        model.modelName = descriptor.modelName;
        model.super = descriptor.super;

        model.accessible = (descriptor.accessible !== false)?true:false;
        model.fullName = descriptor.fullName;
        model.pluginName = descriptor.pluginName;
        model.hasOneRelations = {};
        model.hasManyRelations = {};
        model.isInstance = isInstance;
        model.dbName = descriptor.db;

        descriptors[descriptor.fullName] = descriptor;
    };

    return function(name,_descriptor,cfg){
        _descriptor = _descriptor || {};
        cfg = cfg || deps.config.load();
        // замещаем модель правильной функцией
        var descriptor = _descriptor.normalized ? _descriptor : self.normalizeDescriptor(name,cfg.name,_descriptor);

        self.registerDescriptor(descriptor.fullName,descriptor);

        if (descriptor.db === false) {
            function Model(data){ for(var i in data) this[i] = data[i]; };
            Object.defineProperty(Model.prototype,"model",{value: function(){return Model;}});
            Object.defineProperty(Model,"allProperties",{get: function(){return JSON.parse(JSON.stringify(descriptor.attributes));}});
            finalExtendByDescriptor(Model,descriptor);
            return Q(Model);
        }

        return deps.database.getDatabase(descriptor.db).then(function(db){
            var model = db.define(descriptor.fullName,descriptor.attributes,{
                "methods": descriptor.methods,
                "validations": descriptor.validations,
                "hooks": descriptor.hooks,
                "modelName": descriptor.modelName,
                "fullName": descriptor.fullName,
                "pluginName": descriptor.pluginName
            });

            finalExtendByDescriptor(model,descriptor);

            if (typeof descriptor.hasOne == "object"){
                var hasOne = descriptor.hasOne;
                _.keys(hasOne).forEach(function(key){
                    var refDescr = hasOne[key];
                    var refModel, modRefName, fullRefName;
                    if (typeof refDescr == "string") {
                        modRefName = refDescr;
                        refDescr = {};
                    }
                    else {
                        if (!refDescr.model) modRefName = model.modelName;
                        else modRefName = refDescr.model;
                        delete refDescr.model;
                    }

                    fullRefName = (cfg.name?cfg.name+":":"")+modRefName;
                    if (fullRefName == model.fullName) refModel = model;
                    else refModel = self.getModel(fullRefName);

                    function defineHasOne(){
                        model.hasOneRelations[key] = refDescr;
                        model.hasOneRelations[key].model = refModel;
                        if (refDescr.reverse) refModel.hasManyRelations[refDescr.reverse] = {model: model, reverse: key};
                        model.hasOne(key,refModel,refDescr);
                    }

                    if (refModel === undefined) m.once("model-defined:"+fullRefName,function(newModel){
                        refModel = newModel;
                        defineHasOne();
                    });
                    else defineHasOne();
                });
            }


            if (typeof descriptor.hasMany == "object") {
                var hasMany = descriptor.hasMany;
                _.keys(hasMany).forEach(function (key) {
                    var refDescr = hasMany[key];
                    var refModel, modRefName, fullRefName;
                    if (typeof refDescr == "string") {
                        modRefName = refDescr;
                        refDescr = {};
                    }
                    else {
                        if (!refDescr.model) modRefName = model.modelName;
                        else modRefName = refDescr.model;
                        delete refDescr.model;
                    }
                    fullRefName = (cfg.name ? cfg.name + ":" : "") + modRefName;
                    if (fullRefName == model.fullName) refModel = model;
                    else refModel = self.getModel(fullRefName);

                    function defineHasMany() {
                        model.hasManyRelations[key] = refDescr;
                        model.hasManyRelations[key].model = refModel;

                        if (refDescr.reverse) refModel.hasManyRelations[refDescr.reverse] = {model: model, reverse: key};
                        model.hasMany(key, refModel, {}, refDescr);
                    }

                    if (refModel === undefined) m.once("model-defined:" + fullRefName, function (newModel) {
                        refModel = newModel;
                        defineHasMany();
                    });
                    else defineHasMany();
                });
            }
            return model;
        });
    };
};