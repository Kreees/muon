var fs = require("fs");

function exit(){
    fs.writeFileSync(".muon","");
    process.exit();
}

process.on('SIGINT',exit);
process.on('exit',exit);

module.exports = {
    "server": function() {
        return require("./lib/app.js")
    },
    "plugin" : function() {
        return require("./server/plugin.js")
    }
};