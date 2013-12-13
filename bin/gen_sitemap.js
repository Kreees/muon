#!/usr/bin/env node

var server = require("../module").server();
var spawn = require("child_process").spawn;
var env = process.env;
env["PWD"] = m.__syspath+"lib/lib/get_sitemap/";
var ph = spawn("phantomjs",["phantom.js"],{cwd: m.__syspath+"lib/lib/get_sitemap/",env: env});

m.cfg.serverMode = "sitemap";
try{ server.listen(); }
catch(e){console.log(e.message);process.kill();}

server.onready = function(){
    var first_time = true;
    ph.stdout.on("data",function(data){
        if (first_time){
            var address = data.toString("utf8").replace(/(^\s+)|(\s+$)/g,"");
            require("../lib/bin/get_sitemap/init_phantom")(address);
            first_time = false;
            return;
        }
        console.log("PhantomJS: "+data.toString("utf8").replace(/(^[\s\n]+)|([\s\n]+$)/g,""));
    })

    ph.stderr.on("data",function(data){
        if (first_time) return;
//        console.error("ERROR PhantomJS: "+data);
    })

    ph.on("close",function(code){
        console.log("Phantomjs exited");
        process.kill();
    });
}




