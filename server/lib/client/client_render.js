var fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    cheerio = require("cheerio");

module.exports = function(req,res,baseDir){
    var file = m.path+"/"+baseDir+"/index.html";
    if (fs.existsSync(m.path+"/client/assets/index.html")) file = m.path+"/client/assets/index.html";
    var $ = cheerio.load(fs.readFileSync(file,"utf8"));
    $("html").attr("lang",m.cfg.defaultLang || "en");
    $("head").append("<script src='/muon.js'></script>");
    if (m.cfg.serverMode == "testing"){
        $("head").append("<script src='/jasmin.js'></script>");
    }
    res.set("Content-Type","text/html");
    res.end($.html());
};
