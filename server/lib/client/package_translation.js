var tr_proc = require(m.__sys_path+"/server/lib/client/translation_proc"),
    _ = require("underscore");

module.exports = function(req,res){
    if (!req.query.lang) {
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
        (function(pack_name){
            var plug_name = pack_name.split(":").slice(0,-1).join(":"),
                plugin = m.__plugins[plug_name],
                full_pack_name = pack_name,
                pack_name = full_pack_name.split(":").pop();
            tr_proc.render_translation(plugin,pack_name,req.query.lang || m.default_lang,function(trs){
                counter--;
                ret[pack_name] = trs;
                if(counter == 0) res.end(JSON.stringify(ret));
            });
        })(packs[i]);
    }
};