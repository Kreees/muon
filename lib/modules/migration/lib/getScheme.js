module.exports = function(self, deps) {
    var _ = require('underscore');
    return function(pluginName){
        var valid;
        if (pluginName)
            valid = function(val){
                if(val == pluginName) return true;
                return false;
            };
        else 
            valid = function(val){
                return _.isEmpty(val);
            };  
        var schema = {};
        
        var names = deps.models.getModelsNames();
        _.forEach(names, function(name){
            var fullD = deps.models.getDescriptor(name);
            var model = deps.models.getModel(name);
            // console.log("---"+pluginName+"  --  "+name+"  --  "+model.pluginName);
            if(valid(model.pluginName)){
               var mD = {
                    attributes: model.allProperties,
                    db: model.dbName,
                    hasOne: fullD.hasOne,
                    hasMany: fullD.hasMany,
                    fullName: model.fullName,
                };
                if(!schema[mD.db]){
                   schema[mD.db] = {}; 
                }
                schema[mD.db][model.modelName] = mD; 
            }
            
        });
        return schema;
    };
};