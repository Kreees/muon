var fs = require("fs");

var packages = {};

for(var i in m.__plugins) {
    var plug = m.__plugins[i];
    var plug_packs = fs.readdirSync(plug.cfg.path+"/client/packages/");
    for(var j in plug_packs){
        try{
            fs.statSync(plug.cfg.path+"/client/packages/"+plug_packs[j]+"/package.js");
            packages[(i?i+":":"")+plug_packs[j]] = {
                name: plug_packs[j],
                path: plug.cfg.path+"/client/packages/"+plug_packs[j],
                plugin: i,
                dep_src: false,
                tr: []
            };
        }
        catch(e){continue;}
    }
}

for(var i in packages){
    var pack = packages[i];
    try{
        var trs = fs.readdirSync(pack.path+"/tr/");
        for(var j in trs){
            var stat = fs.statSync(pack.path+"/tr/"+trs[j]);
            if (!stat.isDirectory()) continue;
            pack.tr.push(trs[j]);
        }
    }
    catch(e) {}
    try{
        var stat = fs.statSync(pack.path+"/dependency/src/");
        if (stat.isDirectory())
            pack.dep_src = pack.path+"/dependency/src/";
    }
    catch(e) {}
}

module.exports = packages;