function req(path){return require(m.__sys_path+"/server/lib/"+path);}

var db = require(m.__sys_path+"/server/lib/utils/db/database"),
    models = require(m.__sys_path+"/server/lib/models/models"),
    plugins = require(m.__sys_path+"/server/lib/plugins/plugins"),
    Q = require("q"),
    _ = require("underscore")
;

m.errorize = function(res,statusCode,message){
    res.statusCode = statusCode;
    res.set("Content-Type","text/javascript");
    res.end(JSON.stringify({error: message,statusCode: statusCode}));
}

function init_server(next){
    var next = next || function(){}
    m.__plugins = {}
    m.__plugins[""] = m;
    m.__server_init__ = true;
    Q.when(db.init("mongodb://"+m.cfg.db_host+"/"+m.cfg.db_name)).then(
        function(){
            m.plugins = {};
            plugins.init(m.cfg).then(
                function(a){
                    for(var i in a){
                        if (i in m.__plugins) continue;
                        m.__plugins[i] = a[i];
                        m.plugins[i] = a[i];
                    }
                    models.init(m.cfg).then(
                        function(a){
                            for(var i in a) m[i] = a[i];
                            m.__server_init__ = false;
                            try { next(); }
                            catch(e){ m.kill(e.message) }
                        },function(e){ throw Error("Models load error!");})
                },function(e){ throw Error("Plugins load error!");})
        },function(){ throw Error("Database load error!");});
    return this;
}

try{
module.exports = {
    init: init_server,
    compile_client: req("client/client_render"),
    compile_muonjs: req("client/muon_render"),
    package_render: req("client/package_render"),
    package_view: req("client/package_view"),
    package_translation: req("client/package_translation"),
    api_proc: req("router/api_router"),
    docs_proc: req("router/doc_router")
}
}
catch(e){
    console.log(e.stack);
    process.kill();
}