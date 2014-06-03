module.exports = function(self,deps){
    var _ = require("underscore");
    var Q = require("q");
    var path = require("path");


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
    };

    function normalizeDescription(name,plugin,descr){
        descr = _.clone(descr || {});
        if (descr.extends){
            if (descr.attributes){
                for(var i in descr.super.attributes) {
                    if (i in descr.attributes) m.kill("It's not allowed to override extended model attributes.");
                    else { descr.attributes[i] = descr.super.attributes[i]; }
                }
            }
            else { descr.attributes = descr.super.attributes; }
        };

        var model = _.extend({},descr);

        model.hasOne = descr.hasOne || {};
        _.extend(model.hasOne,descr.belongsTo || {})
        model.hasMany = descr.hasMany || {};
        model.attributes = descr.attributes || {};
        model.modelName = name;
        model.pluginName = plugin;
        model.fullName = ((plugin?plugin+":":"")+name);

        model.validations = descr.validations || {};
        model.methods = descr.methods || {};
        model.hooks = descr.hooks || {};
        model.id = descr.id || ["_id"];
        model.idName = model.id;

        if (descr.db === false) model.db = false;
        else model.db = descr.db || "default";
        model.collection = descr.collection || descr.table || model.fullName.replace(/[:\.]/g,"_");
        model.collectionName = model.collection;

        model.methods = descr.methods;

        model.super = descr.super;

        return model;
    };

    return function(name,_descriptor,cfg){
        var dfd = Q.defer();
        _descriptor = _descriptor || {};
        cfg = cfg || deps.config.load();

        // ищем зависимость на расширение
        if (_descriptor.extends) {
            var dependencyFullName = (cfg.name?cfg.name+":":"")+_descriptor.extends;
            if (self.modelExists(dependencyFullName))
                _descriptor.super = self.getModel(dependencyFullName);
            else if (_descriptor.extends.indexOf(":") != -1)
                throw new self.ErrorModelNotFound("No such model: "+dependencyFullName+". Dependency from model: "+name);
            else throw new self.ErrorExtendedModelNotDefined();
        }

        // замещаем модель правильной функцией
        var descriptor = normalizeDescription(name,cfg.name,_descriptor);
        if (descriptor.db === false) {
            function Model(data){ for(var i in data) this[i] = data[i]; };
            Object.defineProperty(Model.prototype,"model",{value: function(){return Model;}});
            Object.defineProperty(Model,"allProperties",{get: function(){return JSON.parse(JSON.stringify(descriptor.attributes));}});
            finalExtendByDescriptor(Model,descriptor);
            return Q(Model);
        }
        deps.database.getDatabase(descriptor.db).then(function(db){
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

                    function defineHasOne() {
                        model.hasManyRelations[key] = refDescr;
                        model.hasManyRelations[key].model = refModel;

                        if (refDescr.reverse) refModel.hasManyRelations[refDescr.reverse] = {model: model, reverse: key};

                        model.hasMany(key, refModel, {}, refDescr);
                    }

                    if (refModel === undbsdefined) m.once("model-defined:" + fullRefName, function (newModel) {
                        refModel = newModel;
                        defineHasOne();
                    });
                    else defineHasOne();
                });
            }

            dfd.resolve(model);
        }).done();
        return dfd.promise;
    };
};