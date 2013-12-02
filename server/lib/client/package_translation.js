var trProc = require(m.__sys_path+"/server/lib/client/translation_proc"),
    _ = require("underscore");

module.exports = function(req,res){
    var lang = req.path.replace(/^\//,"");
    if (!lang) {
        m.errorize(res,500,"language is not specified");
        return;
    }

    var packs = _.union(_.compact((req.query.packs || "").split(",")));
    var counter = packs.length;
    if(counter == 0){
        res.end("{}");
        return;
    }
    var ret = {};
    for(var i in packs){
        (function(packName){
            var pluginName = packName.split(":").slice(0,-1).join(":"),
                plugin = m.__plugins[pluginName],
                fullPackName = packName,
                packName = fullPackName.split(":").pop();
            trProc.renderTranslation(plugin,packName,lang || m.defaultLang,function(trs){
                counter--;
                ret[fullPackName] = trs;
                if(counter == 0){
                    res.set("Content-Type","application/json");
                    res.end(JSON.stringify(ret));
                }
            });
        })(packs[i]);
    }
};