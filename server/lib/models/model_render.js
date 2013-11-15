var defs = require("./attr_defaults.js");
var vals = require("./attr_validation.js");
var _ = require("underscore");

function get_plugins(plugin){
    var plugins = {};
    function calculate_plugin(plugin,name) {
        plugins[name] = plugin;
        for(var i in plugin.plugins)
            calculate_plugin(plugin.plugins[i],(name?name+":":"")+i)
    }
    calculate_plugin(plugin,plugin.cfg.name);
    return plugins;
}

var get_plugins = _.memoize(get_plugins);

module.exports = {
    get_model_names: function(plugin,pack_models){
        var plugins = get_plugins(plugin);
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
    render_models: function(plugin,list,callback){
        if (typeof list == "function"){
            callback = list;
        }
        var ret = {};
        var plugins = get_plugins(plugin);
        for(var pl_name in plugins){
            var plugin = plugins[pl_name];
            for(var i in plugin.models){
                if (typeof list == "object" && list.indexOf((pl_name?pl_name+":":"")+i) == -1) continue;
                if (!(plugin.models[i].url in plugin.url_access)){
                    continue;
                }
                var model = plugin.models[i];
                var defaults = {};
                for(var j in model.scheme) defaults[j] = model.scheme[j].defaults || defs[model.scheme[j].type];
                var host = m.cfg.protocol+"://";
                if (m.cfg.jsonp && m.cfg.domain) host += m.cfg.domain;
                else host += "0.0.0.0";
                if (m.cfg.port && parseInt(m.cfg.port) != 80)
                    host += ":"+m.cfg.port;
                var model_name = (pl_name?pl_name+":":"")+model.model_name;
                var scheme = {};
                for(var i in model.scheme){
                    scheme[i] = {
                        type: model.scheme[i].type,
                        null_allowed: (model.scheme[i].null_allowed !== undefined)?!!model.scheme[i].null_allowed:true,
                        values: model.scheme[i].values
                    }
                }
                var back_model = {
                    plugin: pl_name,
                    modelName: model_name,
                    urlRoot: host+"/apis/"+(model.plugin_name?model.plugin_name+":":"")+model.model.url,
                    defaults: defaults,
                    scheme: scheme
                };
                var back_model_str = "m.model_"+ model_name.replace(/[:\.]/g,"_");
                back_model_str += " = m.Model.extend(";
                back_model_str += JSON.stringify(back_model)+",{scheme: "+JSON.stringify(scheme)+"});";
                ret[(pl_name?pl_name+":":"")+model.model_name] = back_model_str;
            }
        }
        callback(ret);
    }
}