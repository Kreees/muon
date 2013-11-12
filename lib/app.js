var express = require("express"),
    fs = require("fs"),
    Q = require("q"),
    http = require("http"),
    _ = require("underscore"),
    mime = require("mime"),
    zlib = require("zlib");

global.m = require("./m_init.js");

var app = m.app;
var server = require("../server/server.js");
var server_reload_flag = true;

function base_config(){
    app.use(require('less-middleware')({ src: global.m.path + '/assets' }));
    app.use(express.static(global.m.path + '/client/assets/'));
    app.use("/favicon.ico",function(req,res){res.writeHead(404,"Not found");res.end("")});
    app.use("/",function(req,res,next){
        if (req.path.match(/\.map$/)) {
            res.writeHead(404,"Not found");
            res.end("");
        }
        else next()
    });
    app.use(express.limit('15mb'));
    app.use(express.bodyParser({keepExtensions:true,uploadDir: global.m.path+"/uploads"}));
    app.use(express.cookieParser());
    app.use(express.compress());
};

function dev_config(){
    app.use(express.logger());
    app.use(function(req,res,next){
        if (server_reload_flag) setTimeout(function(){server_reload_flag = true},3000);
        else{
            function relaunch(){
                if (m.__server_init__) return setTimeout(relaunch,100);
                next();
            }
            return relaunch();
        }
        server_reload_flag = false;
        for(var i in require.cache){
            if (i.lastIndexOf("node_modules") == -1)
                if (i == __filename) continue;
                delete require.cache[i];
        }
        server = require("../server/server.js");
        console.log("--------------------------- SERVER RELOADED ------------------------------");
        server.init(next);
    });
    app.use("/muon.js",function(req,res){
        res.set("Content-Type","text/javascript");
        res.end(server.compile_muonjs());
    });
    app.use(function(req,res,next){
        if (req.get('muon-request') == "data-request" || _.isString(req.query.muon)){
            delete req.query.muon;
            next();
            return;
        }
        var target = "client";
        server.compile_client(req,res,target);
    });
    app.use("/apis",function(req,res){
        try{server.api_proc(req,res);}
        catch(e){
            m.log(e);
            res.statusCode = 500;
            res.end("Error");
        }
    });
    app.use("/pack",function(req,res){
        server.package_render(req,res);
    });
    app.use("/pack_view",function(req,res){
        server.package_view(req,res);
    });
    app.use("/pack_translation",function(req,res){
        server.package_translation(req,res);
    });
    app.use("/pack_src",function(req,res){
        var path = req.path.replace(/^\//,"");
        path = path.split("/");
        if (path.length < 2){
            res.statusCode = 404;
            return res.end("Wrong package");
        }
        var pack = path.shift();
        var plugin = "";
        plugin = pack.split(":");
        pack = plugin.pop();
        if (plugin.length == 0) plugin = "";
        else plugin = plugin.join(":");
        if (!(plugin in m.__plugins)){
            res.statusCode = 404;
            return res.end("Wrong plugin name");
        }

        var file = path.join("/");
        var file_name = m.__plugins[plugin].cfg.path+"/client/packages/"+pack +"/dependency/src/"+file;
        if (!fs.existsSync(file_name)){
            res.statusCode = 404;
            return res.end("File doesn't exists");
        }
        var mime_type = mime.lookup(file_name)
        res.writeHead(200,{"Content-Type":mime_type});
        if (/^text/.test(mime_type))
            res.end(fs.readFileSync(file_name,"utf-8"))
        else
            res.end(fs.readFileSync(file_name));
    });
}

function test_config(){

}

function dry_config(){
    var muon = server.compile_muonjs();
    app.use("/muon.js",function(req,res){
        res.set("Content-Type","text/javascript");
        res.end(muon);
    });
    app.use(function(req,res,next){
        if (req.get('muon-request') == "data-request" || _.isString(req.query.muon)) return next();
        server.compile_client(req,res,"client");
    });
    app.use("/apis",server.api_proc);
    app.use("/pack",server.package_render);
    app.use("/pack_translation",server.package_translation);
    app.use("/pack_src",function(req,res){
        var path = req.path.replace(/^\//,"");
        path = path.split("/");
        if (path.length < 2){
            res.statusCode = 404;
            return res.end("Wrong package");
        }
        var pack = path.shift();
        var plugin = "";
        plugin = pack.split(":");
        pack = plugin.pop();
        if (plugin.length == 0) plugin = "";
        else plugin = plugin.join(":");
        if (!(plugin in m.__plugins)){
            res.statusCode = 404;
            return res.end("Wrong plugin name");
        }

        var file = path.join("/");
        var file_name = m.__plugins[plugin].cfg.path+"/client/packages/"+pack +"/dependency/src/"+file;
        if (!fs.existsSync(file_name)){
            res.statusCode = 404;
            return res.end("File doesn't exists");
        }
        var mime_type = mime.lookup(file_name)
        res.writeHead(200,{"Content-Type":mime_type});
        if (/^text/.test(mime_type))
            res.end(fs.readFileSync(file_name,"utf-8"))
        else
            res.end(fs.readFileSync(file_name));
    });
};

var request_list = []
var server_inited = false;

function serv_handler(req,res){
    if (server_inited) app.handle(req,res);
    else request_list.push(_.partial(serv_handler,req,res));
}

serv_handler.listen = function(port,host){
    m.cfg.host = host || m.cfg.host;
    m.cfg.port = port || m.cfg.port;
    http.createServer(serv_handler).listen(m.cfg.port,m.cfg.host);
    return this;
}

server.init(function(){
    if (["testing","testing","development","production"].indexOf(m.cfg.server_mode) == -1) {
        error_flag = true;
        console.log("Error: wrong server mode");
    }
    console.log("Server started in "+m.cfg.server_mode+" mode, listening on "+m.cfg.host+":"+m.cfg.port+" address.");
    server_inited = true;
    app.set("env",m.cfg.server_mode.toLowerCase());
    base_config();
    app.configure("development", dev_config);
    app.configure("production", dry_config);
    app.configure("sitemap", dry_config);
    app.configure("testing", function(){
        test_config();
        dry_config();
    });
    app.use(app.router);
    serv_handler.onready && serv_handler.onready();
    while(request_list.length != 0){
        request_list.shift()();
    }
});

module.exports = serv_handler;

