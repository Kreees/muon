var path = require("path");
var m = {};
m.__sys_path = path.normalize(__dirname+"/../");
m.cfg = require('./load_config.js')();
m.path = m.cfg.path;

process.on('uncaughtException',function(e){
    m.log(e.message, e.stack);
    if (m.__server_init__) process.kill();
});


m.error = function(message,flag){
    console.error(message);
    console.trace();
    if (!!flag) throw Error(message);
    if (m.__server_init__) process.kill();
}

m.kill = function(message){
    require("fs").writeFileSync("./.muon","");
    m.error(message,false);
    process.kill()
}

m.exit = function(message){
    console.error(message);
    process.kill();
}

m.log = function(){
    console.log.apply(console,arguments);
    var e = new Error();
    console.log(e.stack.split("\n")[2]);
}

m.app = require("./express_init.js");

module.exports = m;