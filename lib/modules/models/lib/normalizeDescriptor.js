module.exports = function(self,deps){
    return function(name,plugin,descr){
        descr = _.clone(descr || {});

        // ищем зависимость на расширение
        if (descr.extends) {
            var dependencyFullName = (plugin?plugin+":":"")+descr.extends;
            if (self.modelExists(dependencyFullName))
                descr.super = self.getModel(dependencyFullName);
            else if (descr.extends.indexOf(":") != -1)
                throw new self.ErrorModelNotFound("No such model: "+dependencyFullName+". Dependency from model: "+name);
            else throw new self.ErrorExtendedModelNotDefined();
            ["attributes","methods","validations"].forEach(function(attr){
                var superDescriptor = descriptors[descr.super.fullName];
                if (attr in descr){
                    for(var i in superDescriptor[attr]) {
                        if (i in descr[attr]) m.kill("It's not allowed to override extended model attributes.");
                        else { descr[attr][i] = superDescriptor[attr][i]; }
                    }
                }
                else { descr[attr] = superDescriptor[attr]; }
            });
        }

        var model = _.extend({},descr);

        model.hasOne = descr.hasOne || {};
        _.extend(model.hasOne,descr.belongsTo || {});
        model.hasMany = descr.hasMany || {};
        model.attributes = descr.attributes || {};
        model.modelName = name;
        model.pluginName = plugin;
        model.fullName = self.getFullModelName(name,plugin);

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
        
        Object.defineProperty(model,"normalized",{value: true});
        return model;
    };
};
