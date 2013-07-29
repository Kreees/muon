require("fs").writeFileSync(".muon",process.pid);
var Q = require("q");

module.exports = {
    "server": function() {
        global.m = {};
        global.muon = m;
        m.fs = require("fs");
        m.__sys_path = __dirname;
        m.cfg = require('./lib/load_config.js')();
        m.path = m.cfg.path;
        return require("./lib/app.js")
    },
    "plugin" : function() {
        return require("./server/plugin.js")
    }
};