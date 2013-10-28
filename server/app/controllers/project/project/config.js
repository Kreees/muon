var object_attrs = [
    "host",
    "port",
    "domain",
    "server_mode",
    "protocol",
    "db_name",
    "db_host",
    "db_port",
    "db_user",
    "db_pass",
    "lang"
];
var fs = require("fs");

var super_obj = m.super;
var c = super_obj.extend({
    decorator: function(){
        if (m.cfg.server_mode == "production" || m.wait_restart)
            return ["server_mode","host","domain","port","lang","protocol","version","project_name","wait_restart"]
        else null
    },
    actions: {
        "get": function(){
            return this.model.__data__.config;
        },
        "edit": function(req){
            try{
                var config = JSON.parse(fs.readFileSync(m.cfg.path+"/config.json","utf8"));
                var attrs = (m.cfg.server_mode == "development")?object_attrs:["server_mode"];

                for(var i in attrs){
                    config[attrs[i]] = req.body[attrs[i]];
                    this.model.__data__.config[attrs[i]] = req.body[attrs[i]];
                }
                this.model.__data__.config.wait_restart = true;
                m.wait_restart = true;
                fs.writeFileSync(m.cfg.path+"/config.json",JSON.stringify(config,null,2),"utf-8");
                return this.model.__data__.config;
            }
            catch(e){
                m.kill("Can't save config.js file");
                throw e;
            }
        }
    }
});

module.exports = c;