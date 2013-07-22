var defs = require("./attr_defaults.js");
var vals = require("./attr_validation.js");
var _ = require("underscore");

function get_plugins(){
    var plugins = {};
    function calculate_plugin(plugin,name) {
        plugins[name] = plugin;
        for(var i in plugin.plugins)
            calculate_plugin(plugin.plugins[i],(name?name+":":"")+i)
    }
    calculate_plugin(global.m,"");
    return plugins;
}

var get_plugins = _.memoize(get_plugins);

module.exports = {
    get_model_names: function(pack_models){
        var plugins = get_plugins();
        var pack_model_list = [];
        for(var pl_name in plugins){
            var plugin = plugins[pl_name];
            for(var i in pack_models){
                var token = pack_models[i];
                token = token.replace(/\./g,"\\.").replace(/\*/g,".*?");
                token = RegExp("^"+token+"$");
                for(var j in plugin.models){
                    if (token.test(j)) pack_model_list.push((pl_name?pl_name+":":"")+j);
                }
            }
        }
        return pack_model_list;

    },
    render_models: function(list,callback){
        if (typeof list == "function"){
            callback = list;
        }
        var ret = [];
        var plugins = get_plugins();

        for(var pl_name in plugins){
            var plugin = plugins[pl_name];
            for(var i in plugin.models){
                if (typeof list == "object" && list.indexOf((pl_name?pl_name+":":"")+i) == -1) continue;
                if (!(plugin.models[i].url in plugin.url_access)){
                    continue;
                }
                var model = plugin.models[i];
                var defaults = {}
                for(var j in model.attrs) defaults[j] = model.attrs[j].default || defs[model.attrs[j].type];
                var host = muon.cfg.protocol+"://";
                host += muon.cfg.domain||muon.cfg.host||"localhost";
                if (muon.cfg.port && parseInt(muon.cfg.port) != 80)
                    host += ":"+muon.cfg.port;
                var back_model = {
                    model_name: (pl_name?pl_name+":":"")+model.model_name,
                    urlRoot: host+"/apis/"+(model.plugin_name?model.plugin_name+":":"")+model.model.url,
                    defaults: defaults
                };
                var back_model_str = "muon.model_"+ i.replace(/\./g,"_");
                back_model_str += " = muon.Model.extend(";
                back_model_str += JSON.stringify(back_model)+");";
                ret.push(back_model_str);
            }
        }
        callback("<script>"+ret.join(" ")+"</script>");
    }
}