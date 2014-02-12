var fs = require("fs"),
    fsExt = m.__require__("/utils/fs/fs_ext.js")
;

module.exports = {
    renderTranslation: function(plugin,pack,lang,callback){
        if (!fs.existsSync(plugin.cfg.path+"/client/packages/"+pack+"/tr/"+lang)) lang = 'default';
        fsExt.tree(plugin.cfg.path+"/client/packages/"+pack+"/tr/"+lang,function(files){
            var ret = {};
            for(var i in files){
                var template = files[i].replace(plugin.cfg.path+"/client/packages/"+pack+"/tr/"+lang+"/","");
                template = template.replace(/\/[\w]+\.json$/,"").split("/").reverse().join("_");
                var fullFile = files[i];
                try{
                    var data = JSON.parse(fs.readFileSync(fullFile, "utf-8"));
                    for(var j in data) ret[template+":"+j] = (data[j] instanceof Array)?data[j].join(""):data[j].toString();
                }
                catch(e){
                    m.log(template,pack,lang,e);
                    continue;
                }
            }
            callback(ret);
        },undefined,[".json"]);
    }
}