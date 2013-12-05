var path = require("path");
var m = {};
m.__sys_path = path.normalize(__dirname+"/../");
m.cfg = require('./load_config.js')();
m.path = m.cfg.path;

function procErrorStack(a,from) {
    from = parseInt(from) || 0;
    return a.split("\n").slice(from).filter(function(a){
        return a.indexOf(m.__sys_path+"node_modules") == -1;
    }).join("\n");
}

process.on('uncaughtException',function(e){
    console.log(procErrorStack(e.stack),0);
    if (m.__serverInit__) process.exit();
});

m.log = function(){
    console.log.apply(console,arguments);
    var e = new Error();
    console.log(procErrorStack(e.stack,1));
}

m.error = function(message,flag){
    if (message instanceof Error) console.log(procErrorStack(message.stack),0);
    else m.log(message);
    if (!!flag) throw Error(message);
    if (m.__serverInit__) process.exit();
}

m.exit = function(message){
    console.error(message);
    process.exit();
}

m.kill = function(message){
    require("fs").writeFileSync("./.muon","");
    m.error(message,false);
    process.exit()
}

m.app = require("./express_init.js");
module.exports = m;