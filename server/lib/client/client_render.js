var fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    cheerio = require("cheerio");

module.exports = function(req,res,base_dir){
    var file = m.path+"/"+base_dir+"/index.html";
    if (fs.existsSync(m.path+"/client/assets/index.html")) file = m.path+"/client/assets/index.html";
    var $ = cheerio.load(fs.readFileSync(file,"utf8"));
    $("html").attr("lang",m.cfg.default_lang || "en");
    $("head").append("<script src='/muon.js'></script>");
    $("head").append("<script>m && (m.__domain__ = '"+ (m.cfg.domain || m.cfg.host +":"+ m.cfg.port)+"',"+
        "m.__serverMode__ = '"+m.cfg.server_mode+"',"+
        "m.__protocol__ = '"+(m.cfg.secure?"https":"http")+"');</script>");
    res.set("Content-Type","text/html");
    res.end($.html());
};
