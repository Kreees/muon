var fs = require("fs");
var cur_pid = parseInt(fs.readFileSync(".muon").toString());
if (cur_pid != process.pid && !isNaN(cur_pid)){
    console.log("Server already running: process id "+cur_pid);
    process.kill();
}
fs.writeFileSync(".muon",process.pid);

process.on('SIGINT', function() {
    fs.writeFileSync(".muon","");
    process.kill();
});

module.exports = {
    "server": function() {
        return require("./lib/app.js")
    },
    "plugin" : function() {
        return require("./server/plugin.js")
    }
};