module.exports = function(self,deps){
    var appCfg = deps.config.load();
    var express = require("express");
    return function(app){
        app.use(require('less-middleware')(appCfg.path + '/client/assets/'));
        app.use(express.static(appCfg.path + '/client/assets/'));
        app.use("/favicon.ico",function(req,res){res.writeHead(404,"Not found");res.end("")});
        app.use("/",function(req,res,next){
            if (req.path.match(/\.map$/)) {
                res.writeHead(404,"Not found");
                res.end("");
            }
            else next()
        });
        app.use(express.limit('15mb'));
        app.use(express.bodyParser({keepExtensions:true,uploadDir: appCfg.path+"/uploads"}));
        app.use(express.cookieParser());
        app.use(express.compress());
    }
}

