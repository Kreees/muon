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
 */

global.m = {};

var sys = require("../lib/sys");

sys.loadModule("utils","development").then(function(){
    var fs = require("fs"),
        fsExt = sys.modules.utils.fsExt,
        pathMod = require("path")
        ;

    var muon_cfg = JSON.parse(fs.readFileSync(__dirname+"/../package.json"));

    if (process.argv.length != 3){
        var help = "Use: "+process.argv[1].substring(process.argv[1].lastIndexOf("/")+1,process.argv[1].length);
        help += " <projectName>\n"
        console.log(help);
        process.exit();
    }

    var projectName = process.argv[2],
        path = process.cwd();
    var projectDir = path+"/"+projectName;

    if (fs.existsSync(projectDir)) {
        console.log("Directory '"+projectName+"' already exists.");
        process.exit();
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
        "/client/packages/application/views/layout/page/",
        "/client/packages/application/views/layout/page/index/",
        "/client/packages/application/views/layout/page/error/",
        "/client/packages/application/views/model/",
        "/client/packages/application/views/model/MUON/",
        "/client/packages/application/views/model/MUON/project/",
        "/client/packages/application/views/model/MUON/project/project/",
        "/client/packages/application/views/collection/",
        "/client/packages/application/views/stack/",
        "/client/packages/application/views/stack/application/",
        "/client/packages/application/views/widget/",
        "/client/packages/application/tr/",
        "/client/packages/application/dependency/",
        "/client/packages/application/cache/",
        "/server/",
        "/migrations/",
        "/server/app/",
        "/server/app/models/",
        "/server/app/controllers/",
        "/server/app/middleware/",
        "/server/app/initializers/",
        "/tmp/",
        "/test/",
        "/test/__init__/",
        "/test/acceptance/",
        "/test/unit/",
        "/test/integration/"
    ];

    var trDirs = [
        "/client/packages/application/tr/#{lang}/",
        "/client/packages/application/tr/#{lang}/layout/",
        "/client/packages/application/tr/#{lang}/layout/page/",
        "/client/packages/application/tr/#{lang}/layout/page/index/",
        "/client/packages/application/tr/#{lang}/layout/page/error/",
        "/client/packages/application/tr/#{lang}/model/",
        "/client/packages/application/tr/#{lang}/model/MUON/",
        "/client/packages/application/tr/#{lang}/model/MUON/project/",
        "/client/packages/application/tr/#{lang}/model/MUON/project/project/",
        "/client/packages/application/tr/#{lang}/collection/",
        "/client/packages/application/tr/#{lang}/stack/",
        "/client/packages/application/tr/#{lang}/stack/application/",
        "/client/packages/application/tr/#{lang}/widget/"
    ];

    for(var i in dirs){
        console.log("Creating: "+dirs[i]);
        fs.mkdirSync(projectDir+dirs[i]);
    }

    for(var i in trDirs){
        var langs = ["default","ru"];
        for(var j in langs){
            var dir = trDirs[i].replace(/#\{lang\}/g,langs[j]);
            console.log("Creating: "+dir);
            fs.mkdirSync(projectDir+dir);
        }
    }

    fsExt.traverseDir(__dirname+"/../template",function(file){
        var f_data = fs.readFileSync(file,"utf-8");
        f_data = f_data.replace(/#\{project\}/g,projectName.toLocaleLowerCase());
        f_data = f_data.replace(/#\{user\}/g,process.env.USER?process.env.USER:"");
        f_data = f_data.replace(/#\{lang\}/g,process.env.LANG?process.env.LANG.substr(0,2) || "en":"en");
        f_data = f_data.replace(/#\{version\}/g,muon_cfg.version);
        console.log(file);
        fs.writeFileSync(projectDir+file.replace(pathMod.normalize(__dirname+"/../template"),""),f_data);
    },function(){
        fs.writeFileSync(projectDir+"/.muon","");
        var complete = "Complete!";
        console.log(complete);
    });
}).done();