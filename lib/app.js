var express = require("express"),
    cons = require("consolidate"),
    less = require("less"),
    coffee = require("coffee-script"),
    fs = require("fs"),
    Q = require("q"),
    http = require("http"),
    _ = require("underscore");

//process.on('uncaughtException',function(e){
//    console.log(e.message, e.stack);
//});

global.m.app = express();
global.m.error = function(message,flag){
    console.log(message);
    console.trace();
    if (!!flag) throw Error(message);
}

global.m.kill = function(message){
    global.m.error(message,false);
//    process.kill()
}


var app = global.m.app;
var server = require("../server/server.js");
var server_reload_flag = true;

function less_render(path,opts,callback){
    less.render(fs.readFileSync(path,"utf-8"),callback);
}
function coffee_render(path,opts,callback){
    try { callback(null,coffee.compile(fs.readFileSync(path,"utf-8"))); }
    catch(e) {callback(e,"");}
}

function base_config(){
    for(var i in cons){
        if (i == "clearCache") continue;
        else app.engine(i,cons[i]);
    }
    app.engine("html",require('ejs').renderFile);
    app.engine("jade",require('jade').__express);
    app.engine("less",less_render);
    app.engine("coffee",coffee_render);
    app.engine("css",less_render);

    app.use(require('less-middleware')({ src: global.m.path + '/assets' }));
    app.use(express.static(global.m.path + '/client/assets/'));
    app.use("/favicon.ico",function(req,res){res.writeHead(404,"Not found");res.end("")});
    app.use(express.limit('15mb'));
    app.use(express.bodyParser({keepExtensions:true,uploadDir: global.m.path+"/uploads"}));
    app.use(express.cookieParser());
};

function dev_config(){
    base_config(app);
    app.use(express.logger());
    app.use(function(req,res,next){
        if (server_reload_flag) setTimeout(function(){server_reload_flag = true},1000);
        else{
            next();
            return;
        }
        server_reload_flag = false;
        for(var i in require.cache){
            if (i.lastIndexOf("node_modules") == -1)
                if (i == __filename) continue;
                delete require.cache[i];
        }
        server = require("../server/server.js");
        module.exports.plugin = require("../server/plugin.js");
        console.log("--------------------------- SERVER RELOADED ------------------------------");
        server.init(next);
    });
    app.use(function(req,res,next){
        if (req.get('muon-request') == "data-request" || _.isString(req.query.muon)){
            delete req.query.muon;
            next();
            return;
        }
        var target = "client";
        server.compile_client(target)
            .then(function(data){
                res.end(data);
            },function(err){
                console.log(err);
                res.statusCode = 500;
                res.end("Error");
            })
    });
    app.use(function(req,res,next){
        server.middleware(req,res,next);
    });
    app.post("/upload",function(req,res){
        server = require("../server/server.js");
        server.uploadFiles(req,res)
            .then(function(obj){
                res.end(JSON.stringify(obj));
            },function(err){
                console.log(err);
                res.statusCode = 500;
                res.end(JSON.stringify(err));
            });
    });
    app.use("/apis",function(req,res){
        try{ server.api_proc(req,res); }
        catch(e){
            console.log(e);
            res.statusCode = 500;
            res.end("Error");
        }
    });
    app.use("/pack",function(req,res){
        server.package_renders(req,res);
    });
    app.use("/pack_translation",function(req,res){
        server.package_translation(req,res);
    });

}

function production_config(){
    base_config();
    app.use(express.logger());
    app.use(function(req,res,next){
        if (req.get('muon-request') == "data-request" || _.isString(req.query.muon)){
            next();
            return;
        }
        var target = "client";
        server.compile_client(target)
            .then(function(data){
                res.end(data);
            },function(err){
                console.log(err);
                res.statusCode = 500;
                res.end("Error");
            })
    });
    app.use(server.middleware);
    app.post("/upload",function(req,res){
        server = require("../server/server.js");
        server.uploadFiles(req,res)
            .then(function(obj){
                res.end(JSON.stringify(obj));
            },function(err){
                console.log(err);
                res.statusCode = 500;
                res.end(JSON.stringify(err));
            });
    });
    app.use("/apis",server.api_proc);
    app.use("/pack",server.package_renders);
    app.use("/pack_translation",server.package_translation);
};

var request_list = []
var server_inited = false;

function serv_handler(req,res){
    if (server_inited) return app.handle(req,res);
    request_list.push(_.partial(serv_handler,req,res));
}

serv_handler.listen = function(port,host){
    http.createServer(serv_handler).listen(port || global.m.cfg.port, host || global.m.cfg.host);
}

server.init(function(){
    console.log("Server started in "+global.m.cfg.server_mode+" mode");
    server_inited = true;
    app.configure("development", dev_config);
    app.configure("production", production_config);
    app.set("env",global.m.cfg.server_mode);
    app.set("views",global.m.cfg.path);
    app.use(app.router);
    while(request_list.length != 0){
        request_list.unshift()();
    }
});

module.exports = serv_handler;

