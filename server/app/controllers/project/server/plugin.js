var _ = require("underscore");

function wrap_plugin(obj){
    if (!obj) return;
    obj = JSON.parse(JSON.stringify(obj));
    var new_obj = {
        _id: obj.name,
        models: obj.model_names,
        cfg: obj.cfg,
        plugins: _.keys(obj.plugins).map(function(a){return obj.name+":"+a})
    };
    return new_obj;
}

var obj = {
    dependencies: [
        "user.user"
    ],
    permissions: function(req,res){
        if (!this.user) return [];
        return ["all"];
    },
    actions: {
        "get": function(req,res,value){
            return wrap_plugin(m.plugins[value]);
        },
        "index": function(req,res){
            var ret = [];
            for(var i in m.plugins){
                ret.push(wrap_plugin(m.plugins[i]));
            }
            return ret;
        }
    }
};

module.exports = obj;