var fs = require("fs"),
    _ = require("underscore");

module.exports = function(cfg){
    cfg = cfg || {};
    cfg.path = cfg.path || process.cwd();
    while(!fs.existsSync(cfg.path+"/.muon")){
        var realPath = fs.realpathSync(cfg.path+'/..');
        if (realPath == cfg.path) {
            console.log("Can't launch project outside of project directory. Exiting.");
            process.kill();
        }
        cfg.path = realPath;
    }
    try {
        var fileConfig = JSON.parse(
            fs.readFileSync(cfg.path+"/config.json","utf8")
        );
        for(var i in fileConfig){
            if (i in cfg) continue;
            cfg[i] = fileConfig[i];
        }
    }
    catch(e){};
    var packageConfig = JSON.parse(
        fs.readFileSync(cfg.path+"/package.json","utf8")
    );
    cfg.version = packageConfig.version;
    if (!cfg.name && global.m && global.m.path){
        cfg.name = cfg.path.substring(cfg.path.lastIndexOf("/")+1,cfg.path.length);
        cfg.name = (cfg.parent?cfg.parent+":":"") + cfg.name;
    }
    else {
        cfg.name = cfg.name || "";
    }
    cfg.serverMode = process.env.M_SERVER_MODE || cfg.serverMode || "development";
    cfg.projectName = cfg.path.substring(cfg.path.lastIndexOf("/")+1,cfg.path.length);
    cfg.projectName = cfg.projectName.charAt(0).toLocaleUpperCase()+cfg.projectName.substr(1);
    cfg.name = cfg.name.toLocaleUpperCase();
    cfg.port = process.env.M_SERVER_PORT || cfg.port || 8000;
    cfg.host = process.env.M_SERVER_HOST || cfg.host || "0.0.0.0";
    cfg.protocol = process.env.M_SERVER_PROTO || cfg.protocol || "http";
    cfg.domain = process.env.M_SERVER_DOMAIN || cfg.domain || undefined;

    cfg.db = _.isObject(cfg.db)?cfg.db:{};
    cfg.db.default = cfg.db.default || {};
    for(var i in cfg.db){
        cfg.db[i].type = "mongodb";
        cfg.db[i].host = cfg.db[i].host || "127.0.0.1";
        cfg.db[i].port = cfg.db[i].port || 27017;
        cfg.db[i].name = cfg.db[i].name || cfg.path.substring(cfg.path.lastIndexOf("/")+1,cfg.path.length)+"_"+cfg.serverMode;
        cfg.db[i].user = cfg.db[i].user || "";
        cfg.db[i].pass = cfg.db[i].pass || "";
    }

    cfg.defaultLang = cfg.defaultLang || cfg.lang || "en";
    cfg.plugins = cfg.plugins || {};
    return cfg;
};