#!/usr/bin/env node

var pc = require("child_process"),
    fs = require("fs");

if (!fs.existsSync(process.cwd()+"/.muon")){
    console.error("You should run it from the root of your project.")
    return -1;
}

var pid_val = fs.readFileSync(".muon").toString();
fs.writeFileSync(".muon","");
if (!isFinite(pid_val)) {
    console.log("Server is not running.");
    return;
}

var k = pc.spawn("kill",["-9",pid_val],{});
var presence_flag = true;

k.stderr.on("data",function(){
    presence_flag = false;
});

k.on("close",function(){
    if (presence_flag) console.log("Server was shut down");
    else console.log("Server is not running");
})