#!/usr/bin/env node

var fs = require("fs");
var argv = require("optimist").argv;

try{ var muon = require("../module"); }
catch(e){
    console.error("You should run it from the root of your project. Exiting.");
    console.log("Error: "+e.message);
    return -1;
}
if (!fs.existsSync(".muon")){
    console.error("You should run it from the root of your project. Exiting.")
    console.log("Error: file .muon does not exists in this directory.");
    console.log("Error: If you're in the root of muon.js project, try to create this file manually.");
    return -1;
}

if (argv.help){
    console.log(argv.$0+": util to start M server");
    console.log("Run: "+argv.$0+" [options] <server mode>");
    console.log("\nOptions:");
    function console_params(msgs){
        var offset = 16;
        msgs.map(function(a){
            a = a.split(" - ");
            if (a.length != 2) return;
            if (offset < a[0].length) offset = a[0].length;
        });
        msgs.map(function(a){
            var str = "";
            a = a.split(" - ");
            if (a.length == 2){
                for(var i = 0; i < offset + 2 - a[0].length; i ++) str += " ";
                console.log(str+ a.join("  -  "));
            }
            if (a.length == 1){
                for(var i = 0; i < offset + 2 + "  -  ".length; i ++) str += " ";
                console.log(str+a[0]);
            }
        });
    }
    console_params([,
        "--help - Run this help message",
        "-d, --detach - Run detached",
        "",
        "Next params overrides default ones defined in 'config.json' file",
        "-h, --host <val> - Listening host",
        "-p, --port <val> - Listening port",
        "-D, --domain <val> - Domain name for foreign site requests",
        ""
    ]);
    console.log("Server modes:");
    console_params([,
        "development - Server with live per request reloading, with all debug ",
//        "testing - Server is launched once to run all defined client- and server-side test modules (requires PhantomJS)",
//        "indexing - Server is launched once to generate 'sitemap.xml' file for searching robots (requires PhantomJS)",
        "production - Clear cached server with automated robot response generation and indexing (requires PhantomJS)",
//        "production-clear - Clear cached server without PhantomJS dependency",
//        "phantom - Wrap on PhantomJS for remote testing and indexing purposes",
        ""
    ]);
    return;
}

var error_flag = false;
var port = argv.port || argv.p || "";
var detach = argv.d || argv.detach;
var host = argv.host || argv.h || "";
var domain = argv.domain || argv.D || "";
var server_mode = argv._[0] || "";

if (detach && (typeof detach == "string")){
    server_mode = detach; argv._.unshift(detach); detach = true;
}

for(var i in argv){
    if (["d","domain","D","detach","p","port","h","host","help","$0","_"].indexOf(i) == -1){
        error_flag = true;
        console.log("Error: wrong argument: "+i);
    }
}

if (["","development","production"].indexOf(server_mode) == -1) {
    error_flag = true;
    console.log("Error: wrong server mode");
}

if (port && (!isFinite(port) || port < 1 || port > 65535)){
    error_flag = true;
    console.log("Error: port value should be a valid port number (1..65535)");
}

if (argv._.length > 1) {
    error_flag = true;
    console.log("Error: wrong arguments: "+argv._.slice(1,argv._.length).join(" "));
}

if (error_flag) return -1;

if (argv.detach || argv.d){
    var out = fs.openSync('./tmp/out.log', 'a');
    var err = fs.openSync('./tmp/error.log', 'a');
    var spawn = require("child_process").spawn;
    try { var cfg = JSON.parse(fs.readFileSync("./config.json").toString()); }
    catch(e){ var cfg = {}; }
    host = host || cfg.host || "0.0.0.0";
    port = port || cfg.port || "8000";
    server_mode = server_mode || cfg.server_mode || "development";
    var new_args = [];
    for(var i in argv){
        if (i == "_" || i == "$0" || i == "detach" || i == "d") continue;
        new_args.push((i.length == 1?"-":"--")+i);
        if (argv[i] !== true) new_args.push(argv[i]);
    }
    if (argv._.length > 0) new_args = new_args.concat(argv._);
    var clone = spawn(argv.$0,new_args,{detached: true,stdio:["ignore",out,err]});
    console.log("Server started in "+server_mode+" mode, listening on "+host+":"+port+" address.");
    console.log("Default output log file: ./tmp/out.log");
    console.log("Default error log file: ./tmp/error.log");
    console.log("Process detached with pid: "+clone.pid);
    console.log("Run 'm-kill' to shut down");
    clone.unref();
    return;
}

process.env.M_SERVER_MODE = server_mode;
process.env.M_SERVER_PORT = port;
process.env.M_SERVER_HOST = host;
process.env.M_SERVER_PROTO = "http";
process.env.M_SERVER_DOMAIN = domain;

var server = muon.server();
server.listen.apply(server,[port,host]);
server.onready = function(){
    console.log("Press Ctrl-C to shut down")
}

