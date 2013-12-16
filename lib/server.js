var express = require("express"),
    fs = require("fs"),
    Q = require("q"),
    http = require("http"),
    _ = require("underscore"),
    mime = require("mime"),
    zlib = require("zlib");


function req(path){return require(m.__syspath+"/lib/"+path);};
var app = m.app = require("./express_init.js");

m.errorize = function(res,statusCode,message){
    res.statusCode = statusCode;
    res.set("Content-Type","text/javascript");
    res.end(JSON.stringify({error: message,statusCode: statusCode}));
}

var serverReloadFlag = true;

function getServerHandler(){
    return {
        compileClient: req("client/client_render"),
        compileMuonJs: req("client/muon_render"),
        packageRender: req("client/package_render"),
        packageView: req("client/package_view"),
        packageTranslation: req("client/package_translation"),
        apiProc: req("router/api_router")
    };
}

var server = getServerHandler();

function baseConfig(){
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

function devConfig(){
//    app.use(express.logger());
    app.use(function(req,res,next){
        if (serverReloadFlag)
            setTimeout(function(){
                serverReloadFlag = true
            },3000);
        else{
            function relaunch(){
                if (m.__serverInit__) return setTimeout(relaunch,100);
                next();
            }
            return relaunch();
        }
        m.reload(function(){
            server = getServerHandler();
            serverReloadFlag = false;
//            console.log("================================ reload ==================================");
            next();
        })
    });
    app.use("/muon.js",function(req,res){
        res.set("Content-Type","text/javascript");
        res.end(server.compileMuonJs());
    });
    app.use(function(req,res,next){
        if (req.get('muon-request') == "data-request" || _.isString(req.query.muon)){
            delete req.query.muon;
            return _.defer(next);
        }
        var target = "client";
        server.compileClient(req,res,target);
    });
    app.use("/apis",function(req,res){
        try{ server.apiProc(req,res); }
        catch(e){
            m.error(e);
            res.statusCode = 500;
            res.end("Error");
        }
    });
    app.use("/pack",function(req,res){
        server.packageRender(req,res);
    });
    app.use("/pack_view",function(req,res){
        server.packageView(req,res);
    });
    app.use("/pack_translation",function(req,res){
        server.packageTranslation(req,res);
    });
    app.use("/pack_src",function(req,res){
        var path = req.path.replace(/^\//,"");
        path = path.split("/");
        if (path.length < 2){
            res.statusCode = 404;
            return res.end("Wrong package");
        }
        var pack = path.shift();
        var plugin = pack.split(":");
        pack = plugin.pop();
        if (plugin.length == 0) plugin = "";
        else plugin = plugin.join(":");
        if (!(plugin in m.__plugins)){
            res.statusCode = 404;
            return res.end("Wrong plugin name");
        }

        var file = path.join("/");
        var fileName = m.__plugins[plugin].cfg.path+"/client/packages/"+pack +"/dependency/src/"+file;
        if (!fs.existsSync(fileName)){
            res.statusCode = 404;
            return res.end("File doesn't exists");
        }
        var mimeType = mime.lookup(fileName)
        res.writeHead(200,{"Content-Type":mimeType});
        if (/^text/.test(mimeType))
            res.end(fs.readFileSync(fileName,"utf-8"))
        else
            res.end(fs.readFileSync(fileName));
    });
}

function dryConfig(){
    var muon = server.compileMuonJs();
    app.use("/muon.js",function(req,res){
        res.set("Content-Type","text/javascript");
        res.end(muon);
    });
    app.use(function(req,res,next){
        if (req.get('muon-request') == "data-request" || _.isString(req.query.muon)){
            delete req.query.muon;
            next();
        }
        else {
            var target = "client";
            server.compileClient(req,res,target);
        }
    });
    app.use("/apis",server.apiProc);
    app.use("/pack",server.packageRender);
    app.use("/pack_translation",server.packageTranslation);
    app.use("/pack_src",function(req,res){
        var path = req.path.replace(/^\//,"");
        path = path.split("/");
        if (path.length < 2){
            res.statusCode = 404;
            return res.end("Wrong package");
        }
        var pack = path.shift();
        var plugin = pack.split(":");
        pack = plugin.pop();
        if (plugin.length == 0) plugin = "";
        else plugin = plugin.join(":");
        if (!(plugin in m.__plugins)){
            res.statusCode = 404;
            return res.end("Wrong plugin name");
        }

        var file = path.join("/");
        var fileName = m.__plugins[plugin].cfg.path+"/client/packages/"+pack +"/dependency/src/"+file;
        if (!fs.existsSync(fileName)){
            res.statusCode = 404;
            return res.end("File doesn't exists");
        }
        var mimeType = mime.lookup(fileName)
        res.writeHead(200,{"Content-Type":mimeType});
        if (/^text/.test(mimeType))
            res.end(fs.readFileSync(fileName,"utf-8"))
        else
            res.end(fs.readFileSync(fileName));
    });
};

function serverHandler(req,res){
    app.handle(req,res);
}

var muonserver;

serverHandler.listen = function(port,host){
    m.cfg.host = host || m.cfg.host;
    m.cfg.port = port || m.cfg.port;
    muonserver = http.createServer(app).listen(m.cfg.port,m.cfg.host);

    //TODO: maybe we should keep muon server or return it from listen as recommended
    //https://github.com/visionmedia/express/issues/1366
    return(muonserver);
}

serverHandler.close = function(callback){
    if (muonserver) {
        app.close();
        muonserver.close(callback);
    }
    else m.log("Muon server wasn't initialized via its' listen method. You should use proper server object to stop port listening.")
};

(function(){
    if (["testing","development","production"].indexOf(m.cfg.serverMode) == -1) {
        m.kill("Error: wrong server mode: " + m.cfg.serverMode);
    }
    app.set("env",m.cfg.serverMode.toLowerCase());
    baseConfig();
    app.configure("development", devConfig);
    app.configure("production", dryConfig);
    app.configure("sitemap", dryConfig);
    app.configure("testing", function(){
        dryConfig();
    });
    app.use(app.router);
})();

module.exports = serverHandler;

