var express = require("express"),
    fs = require("fs"),
    Q = require("q"),
    _ = require("underscore"),
    mime = require("mime"),
    zlib = require("zlib");

m.errorize = function(res,statusCode,message){
    res.statusCode = statusCode;
    res.set("Content-Type","text/javascript");
    res.end(JSON.stringify({error: message,statusCode: statusCode}));
}

var serverReloadFlag = true;

function getServerHandler(){
    return {
        compileClient: m.sys.require("/client/client_render"),
        compileMuonJs: m.sys.require("/client/muon_render"),
        packageRender: m.sys.require("/client/package_render"),
        packageView: m.sys.require("/client/package_view"),
        packageTranslation: m.sys.require("/client/package_translation"),
        apiProc: m.sys.require("/router/api_router").run
    };
};

var server = getServerHandler();

function serverHandler(req,res){
    app.handle(req,res);
}

serverHandler.listen = function(port,host,callback){
    switch(arguments.length){
        case 0:
            callback = function(){};
            break;
        case 1:
            if (typeof port == "function") callback = port;
            else {
                m.cfg.port = port;
                callback = function(){};
            }
            break;
        case 2:
            m.cfg.port = port;
            if (typeof host == "function") callback = host;
            else {
                m.cfg.host = host;
                callback = function(){};
            }
            break;
        case 3:
            m.cfg.port = port;
            m.cfg.host = host;
            if (typeof callback != "function"){
                console.log("Warnning! Third argument of listen should be a callback method.");
                callback = function(){};
            }
            break;
        default: throw Error("Wrong arguments.");
    }

    var serv;
    if (m.cfg.protocol.toUpperCase() == "HTTPS"){
        serv = require("https").createServer({
            key: fs.readFileSync(m.cfg.path+"/"+ m.cfg.https.key),
            cert:fs.readFileSync(m.cfg.path+"/"+ m.cfg.https.cert)
        },app);
    }
    else serv = require("http").createServer(app);

    serverHandler.srv = serv;
    var incomeSocks = [];

    serv.on("connection",function(sock){
        incomeSocks.push(sock)
        sock.on("close",function(){ incomeSocks.splice(incomeSocks.indexOf(sock),1); });
    });

    serverHandler.close = function(callback){
        incomeSocks.forEach(function(sock){ sock.destroy(); });
        return serv.close(callback);
    }

    return serv.listen(m.cfg.port,m.cfg.host,callback);
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

serverHandler.driver = server;

module.exports = serverHandler;

