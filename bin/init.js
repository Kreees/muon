#!/usr/bin/env node
/**
 *
 * Project initialization command
 * Example: muon-init thing
 *
 * Creates template project directory
 *
 * @file
 * @name ./bin/init.js
 * @author Kreees
 */

global.m = {};
global.muon = global.m;



var fs = require("fs"),
    fs_ext = require("../server/lib/utils/fs/fs_ext")
//    load_config = require("../lib/load_config.js")
;

var muon_cfg = JSON.parse(fs.readFileSync(__dirname+"/../package.json"));

if (process.argv.length != 3){
    var help = "Use: "+process.argv[1].substring(process.argv[1].lastIndexOf("/")+1,process.argv[1].length);
    help += " <project_name>\n"
    console.log(help);
    process.kill();
}

var project_name = process.argv[2],
    path = process.cwd();
var project_dir = path+"/"+project_name;

if (fs.existsSync(project_dir)) {
    console.log("Directory '"+project_name+"' already exists! Exiting.");
    process.kill();
}

var dirs = [
    "",
    "/client/",
    "/client/assets/",
    "/client/assets/img",
    "/client/assets/js",
    "/client/assets/css",
    "/client/packages/",
    "/client/packages/application",
    "/client/packages/application/views/",
    "/client/packages/application/views/layout/",
    "/client/packages/application/views/layout/application/",
    "/client/packages/application/views/layout/page/",
    "/client/packages/application/views/layout/page/index/",
    "/client/packages/application/views/layout/page/error/",
    "/client/packages/application/views/model/",
    "/client/packages/application/views/model/MUON/",
    "/client/packages/application/views/model/MUON/project/",
    "/client/packages/application/views/model/MUON/project/project/",
    "/client/packages/application/views/collection/",
    "/client/packages/application/views/stack/",
    "/client/packages/application/views/action/",
    "/client/packages/application/tr/",
    "/client/packages/application/dependency/",
    "/client/packages/application/cache/",
    "/server/",
    "/server/app/",
    "/server/app/models/",
    "/server/app/controllers/",
    "/server/app/middleware/",
    "/server/app/decorators/",
    "/server/app/initialisers/",
    "/server/helpers/",
    "/tmp/",
    "/lib/"
];

var tr_dirs = [
    "/client/packages/application/tr/#{lang}/",
    "/client/packages/application/tr/#{lang}/layout/",
    "/client/packages/application/tr/#{lang}/layout/application/",
    "/client/packages/application/tr/#{lang}/layout/page/",
    "/client/packages/application/tr/#{lang}/layout/page/index/",
    "/client/packages/application/tr/#{lang}/layout/page/error/",
    "/client/packages/application/tr/#{lang}/model/",
    "/client/packages/application/tr/#{lang}/model/MUON/",
    "/client/packages/application/tr/#{lang}/model/MUON/project/",
    "/client/packages/application/tr/#{lang}/model/MUON/project/project/",
    "/client/packages/application/tr/#{lang}/collection/",
    "/client/packages/application/tr/#{lang}/stack/",
    "/client/packages/application/tr/#{lang}/action/"
];

for(var i in dirs){
    console.log("Creating: "+dirs[i]);
    fs.mkdirSync(project_dir+dirs[i]);
}

for(var i in tr_dirs){
    var langs = ["default","ru"];
    for(var j in langs){
        var dir = tr_dirs[i].replace(/#\{lang\}/g,langs[j]);
        console.log("Creating: "+dir);
        fs.mkdirSync(project_dir+dir);
    }
}

fs_ext.traverse_dir(__dirname+"/../_template_",function(file){
    var f_data = fs.readFileSync(file,"utf-8");
    f_data = f_data.replace(/#\{project\}/g,project_name);
    f_data = f_data.replace(/#\{user\}/g,process.env.USER);
    f_data = f_data.replace(/#\{lang\}/g,process.env.LANG.substr(0,2) || "en");
    f_data = f_data.replace(/#\{version\}/g,muon_cfg.version);
    fs.writeFileSync(project_dir+file.replace(__dirname+"/../_template_",""),f_data);
},function(){
    var complete = "Complete!";
    console.log(complete);
});
