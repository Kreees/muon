var fs = require("fs"),
    _ = require("underscore");

module.exports = function(cfg){
    cfg = cfg || {};
    cfg.path = cfg.path || process.cwd();
    var realPath = cfg.path;
    while(!fs.existsSync(realPath+"/.muon")){
        var prevPath = realPath;
        realPath = fs.realpathSync(realPath+'/..');
        if (realPath == prevPath) {
            console.log("Can't launch project outside of project directory. Exiting.");
            process.kill();
        }
    }

    if (cfg.serverMode != "testing") cfg.path = realPath;

    try {
        var fileConfig = JSON.parse(fs.readFileSync(realPath+"/config.json","utf8"));
        for(var i in fileConfig){
            if (cfg[i]) continue;
            cfg[i] = fileConfig[i];
        }
    }
    catch(e){};

    var packageConfig = JSON.parse(
        fs.readFileSync(realPath+"/package.json","utf8")
    );

    cfg.version = packageConfig.version;
    cfg.serverMode = process.env.M_SERVER_MODE || cfg.serverMode || "development";
    cfg.projectName = realPath.substring(realPath.lastIndexOf("/")+1,realPath.length);
    cfg.projectName = cfg.projectName.charAt(0).toLocaleUpperCase()+cfg.projectName.substr(1);
    cfg.port = process.env.M_SERVER_PORT || cfg.port || 8000;
    cfg.host = process.env.M_SERVER_HOST || cfg.host || "0.0.0.0";
    cfg.protocol = process.env.M_SERVER_PROTO || cfg.protocol || "http";
    cfg.domain = process.env.M_SERVER_DOMAIN || cfg.domain || undefined;

    if (process.env.M_AUTORELOAD)
        cfg.autoreload = ((process.env.M_AUTORELOAD == "1") || ((process.env.M_AUTORELOAD || "").toLowerCase() == "true")?true:false);
    else
        if (cfg.autoreload === undefined) cfg.autoreload = ((cfg.serverMode == "development")?true:false);
    cfg.autoreload = !!cfg.autoreload;

    cfg.defaultLang = cfg.defaultLang || cfg.lang || "en";

    cfg.db = _.isObject(cfg.db)?cfg.db: false;
    if (cfg.db){
        if (cfg.db.default === true) cfg.db.default = {};
        for(var i in cfg.db){
            cfg.db[i].type = cfg.db[i].type || "mongodb";
            cfg.db[i].host = cfg.db[i].host || "127.0.0.1";
            cfg.db[i].port = cfg.db[i].port || 27017;
            cfg.db[i].database = cfg.db[i].database || cfg.db[i].name || (cfg.projectName+"_"+i+"_"+cfg.serverMode).replace(/[\.!\-%\$~]/g,"_");
            cfg.db[i].user = cfg.db[i].user || "";
            cfg.db[i].pass = cfg.db[i].pass || "";
            cfg.db[i].pathname = cfg.db[i].pathname || cfg.db[i].name+".db";
        }
    }

    cfg.defaultORM = cfg.defaultORM || "node-orm2";
    cfg.ORMs = _.uniq((cfg.ORMs || []).concat([cfg.defaultORM]));
    cfg.plugins = cfg.plugins || {};
    return cfg;
};