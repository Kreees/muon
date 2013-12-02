var object_attrs = [
    "host",
    "port",
    "domain",
    "serverMode",
    "protocol",
    "dbName",
    "dbHost",
    "dbPort",
    "dbUser",
    "dbPass",
    "lang"
];
var fs = require("fs");

var superObject = m.super;
var c = superObject.extend({
    decorator: function(){
        if (m.cfg.serverMode == "production" || m.waitRestart)
            return ["serverMode","host","domain","port","lang","protocol","version","project_name","waitRestart"]
        else null
    },
    actions: {
        "get": function(){
            return this.model.__data__.config;
        },
        "edit": function(req){
            try{
                var config = JSON.parse(fs.readFileSync(m.cfg.path+"/config.json","utf8"));
                var attrs = (m.cfg.serverMode == "development")?object_attrs:["serverMode"];

                for(var i in attrs){
                    config[attrs[i]] = req.body[attrs[i]];
                    this.model.__data__.config[attrs[i]] = req.body[attrs[i]];
                }
                this.model.__data__.config.waitRestart = true;
                m.waitRestart = true;
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