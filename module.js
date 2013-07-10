require("fs").writeFileSync(".muon",process.pid);
var Q = require("q");

module.exports = {
    "server": function() {
        global.m = {};
        global.muon = global.m;
        global.m.fs = require("fs");
        global.m.__sys_path = __dirname;
        global.m.cfg = require('./lib/load_config.js')();
        global.m.path = global.m.cfg.path;
        return require("./lib/app.js")
    },
    "plugin" : function(cfg) {
        cfg = cfg || {};
        cfg.path = __dirname;
        cfg = require('./lib/load_config.js')(cfg);
        return require("./server/plugin.js")(cfg)
    }
};