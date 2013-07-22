module.exports = m.rest.extend({
    permissions: function(){
       return ["get"];
    },
    actions: {
         "get": function(req,res,value){
             return this.__data__[value];
         }
    }
});