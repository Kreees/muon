var fs = require("fs");

module.exports = function (){
    var dir = fs.readdirSync(m.__sys_path+"/client/muon/");
    dir.sort();
    var data = "(function(){\n";
    for(var i in dir){
        if (!/\.js$/.test(dir[i])) continue;
        data += fs.readFileSync(m.__sys_path+"/client/muon/"+dir[i],"utf8")
    }
    data += "\n\n";
    data += "__domain__ = '"+ (m.cfg.domain || m.cfg.host +":"+ m.cfg.port)+"',"+
            "__serverMode__ = '"+m.cfg.serverMode+"',"+
            "__protocol__ = '"+(m.cfg.secure?"https":"http")+"';";
    data += "\n})();\n\n";
    return data;
}