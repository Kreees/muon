// Prepare properties for ddl-sync syntax

module.exports = function(self, deps){
    var _ = require('underscore');
    return function(props){
        var pp = JSON.parse(JSON.stringify(props));
        // _.each(pp,function(property){
            // if (property.required === false) property.required = undefined;
        // });
        return pp;
    };
};
