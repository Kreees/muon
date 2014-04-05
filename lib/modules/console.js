function procErrorStack(a,from) {
    from = parseInt(from) || 0;
    return a.split("\n").slice(from).filter(function(a){
        return a.indexOf(m.sys.path+"node_modules") == -1;
    }).map(function(a){
            return a.replace(m.sys.path, m.cfg.path+"/node_modules/muon/");
        }).join("\n");
}

m.log = function(){
    console.log.apply(console,arguments);
    var e = new Error();
    console.log(procErrorStack(e.stack.split("\n")[2]));
}

m.error = function(message){
    if (this.cfg && this.cfg.serverMode == "testing" && !m.cfg.serverInitFlag) return;
    if (message instanceof Error) console.log(procErrorStack(message.stack));
    else {
        var e = new Error();
        console.log.apply(console,arguments);
        console.log(procErrorStack(e.stack,2));
    }
    if (m.sys.serverInitFlag) process.exit();
}

m.exit = function(message){
    console.error(message);
    process.exit();
}

m.kill = function(message){
    require("fs").writeFileSync("./.muon","");
    m.error(message);
    process.exit()
}

process.on('uncaughtException',function(e){
    m.error(e);
    if (m.sys.serverInitFlag) process.exit();
});