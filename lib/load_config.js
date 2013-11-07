var fs = require("fs");

module.exports = function(cfg){
    cfg = cfg || {};
    cfg.path = cfg.path || process.cwd();
    while(!fs.existsSync(cfg.path+"/.muon")){
        var real_path = fs.realpathSync(cfg.path+'/..');
        if (real_path == cfg.path) {
            console.log("Can't launch project outside of project directory. Exiting.");
            process.kill();
        }
        cfg.path = real_path;
    }
    try {
        var file_config = JSON.parse(
            fs.readFileSync(cfg.path+"/config.json","utf8")
        );
        for(var i in file_config){
            if (i in cfg) continue;
            cfg[i] = file_config[i];
        }
    }
    catch(e){};
    var package_config = JSON.parse(
        fs.readFileSync(cfg.path+"/package.json","utf8")
    );
    cfg.version = package_config.version;
    if (!cfg.name && global.m && global.m.path){
        cfg.name = cfg.path.substring(cfg.path.lastIndexOf("/")+1,cfg.path.length);
        cfg.name = (cfg.parent?cfg.parent+":":"") + cfg.name;
    }
    else {
        cfg.name = cfg.name || "";
    }
    cfg.project_name = cfg.path.substring(cfg.path.lastIndexOf("/")+1,cfg.path.length);
    cfg.project_name = cfg.project_name.charAt(0).toLocaleUpperCase()+cfg.project_name.substr(1);
    cfg.name = cfg.name.toLocaleUpperCase();
    cfg.port = process.env.M_SERVER_PORT || cfg.port || 8000;
    cfg.host = process.env.M_SERVER_HOST || cfg.host || "0.0.0.0";
    cfg.protocol = process.env.M_SERVER_PROTO || cfg.protocol || "http";
    cfg.domain = process.env.M_SERVER_DOMAIN || cfg.domain || undefined;
    cfg.db_host = cfg.db_host || "127.0.0.1";
    cfg.db_name = cfg.db_name || cfg.path.substring(cfg.path.lastIndexOf("/")+1,cfg.path.length);
    cfg.db_user = cfg.db_user || "";
    cfg.db_pass = cfg.db_pass || "";
    cfg.server_mode = process.env.M_SERVER_MODE || cfg.server_mode || "development";
    cfg.default_lang = cfg.default_lang || cfg.lang || "en";
    cfg.plugins = cfg.plugins || {};
    return cfg;
};