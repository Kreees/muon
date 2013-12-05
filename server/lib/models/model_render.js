var defs = require("./attr_defaults.js");
var vals = require("./attr_validation.js");
var _ = require("underscore");

function getPlugin(plugin){
    var plugins = {};
    function calculatePlugin(plugin,name) {
        plugins[name] = plugin;
        for(var i in plugin.plugins)
            calculatePlugin(plugin.plugins[i],(name?name+":":"")+i)
    }
    calculatePlugin(plugin,plugin.cfg.name);
    return plugins;
}

var getPlugin = _.memoize(getPlugin);

module.exports = {
    renderModels: function(plugin,packModels,callback){
        var plugins = getPlugin(plugin);
        var list = [];
        for(var pluginName in plugins){
            var plugin = plugins[pluginName];
            for(var i in packModels){
                var token = packModels[i];
                token = token.replace(/\./g,"\\.").replace(/\*/g,".*?");
                token = RegExp("^"+token+"$");
                for(var j in plugin.models){
                    if (token.test(j)) list.push((pluginName?pluginName+":":"")+j);
                }
            }
        }
        var ret = {};
        var plugins = getPlugin(plugin);
        try{
            for(var pluginName in plugins){
                var plugin = plugins[pluginName];
                for(var i in plugin.models){
                    if (list.indexOf((pluginName?pluginName+":":"")+i) == -1) continue;
                    if (!(plugin.models[i].url in plugin.urlAccess)){
                        continue;
                    }
                    var model = plugin.models[i];
                    var defaults = {};
                    for(var j in model.scheme)
                        defaults[j] = (model.scheme[j].defaults !== undefined)?model.scheme[j].defaults:defs[model.scheme[j].type];
                    var host = m.cfg.protocol+"://";
                    if (m.cfg.jsonp && m.cfg.domain) host += m.cfg.domain;
                    else host += "0.0.0.0";
                    if (m.cfg.port && parseInt(m.cfg.port) != 80)
                        host += ":"+m.cfg.port;
                    var modelName = (pluginName?pluginName+":":"")+model.modelName;
                    var scheme = {};
                    for(var i in model.scheme){
                        scheme[i] = {
                            type: model.scheme[i].type,
                            nullAllowed: (model.scheme[i].nullAllowed !== undefined)?!!model.scheme[i].nullAllowed:true,
                            values: model.scheme[i].values
                        }
                    }
                    var backboneModel = {
                        plugin: pluginName,
                        modelName: modelName,
                        urlRoot: host+"/apis/"+(model.pluginName?model.pluginName+":":"")+model.model.url,
                        defaults: defaults,
                        scheme: scheme
                    };
                    var backboneModelString = "m.model_"+ modelName.replace(/[:\.]/g,"_");
                    backboneModelString += " = m.Model.extend(";
                    backboneModelString += JSON.stringify(backboneModel)+",{scheme: "+JSON.stringify(scheme)+"});";

                    ret[(pluginName?pluginName+":":"")+model.modelName] = backboneModelString;
                }
            }
        }
        catch(e){
            m.kill(e);
        }
        callback(ret);
    }
}