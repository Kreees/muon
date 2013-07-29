var fs = require("fs"),
    fs_proc = require(m.__sys_path+"/server/lib/utils/fs/fs_ext.js")
;

module.exports = {
    render_translation: function(plugin,pack,lang,callback){
        if (!fs.existsSync(plugin.cfg.path+"/client/packages/"+pack+"/tr/"+lang)) lang = 'default';
        fs_proc.tree(plugin.cfg.path+"/client/packages/"+pack+"/tr/"+lang,function(files){
            var ret = {};
            for(var i in files){
                var template = files[i].replace(plugin.cfg.path+"/client/packages/"+pack+"/tr/"+lang+"/","");
                template = template.replace(/\/[\w]+\.json$/,"").split("/").reverse().join("_");
                var full_file = files[i];
                try{
                    var data = JSON.parse(fs.readFileSync(full_file, "utf-8"));
                    for(var j in data) ret[template+":"+j] = (data[j] instanceof Array)?data[j].join(""):data[j].toString();
                }
                catch(e){
                    console.log(template,pack,lang,e);
                    continue;
                }
            }
            callback(ret);
        },undefined,[".json"]);
    }
}