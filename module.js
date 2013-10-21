require("fs").writeFileSync(".muon",process.pid);
var Q = require("q");

module.exports = {
    "server": function() {
        return require("./lib/app.js")
    },
    "plugin" : function() {
        return require("./server/plugin.js")
    }
};