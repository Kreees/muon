var fs = require("fs"),
    _ = require("underscore"),
    Q = require("q");

module.exports = function(req,res,base_dir){
    var file = m.path+"/"+base_dir+"/index.html";
    if (fs.existsSync(m.path+"/client/assets/index.html")) file = m.path+"/client/assets/index.html";
    res.end(fs.readFileSync(file,"utf8"));
};
