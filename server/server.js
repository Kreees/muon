var api_router = require(m.__sys_path+"/server/lib/router/api_router"),
    doc_router = require(m.__sys_path+"/server/lib/router/doc_router"),
    db = require(m.__sys_path+"/server/lib/utils/db/database"),
    models = require(m.__sys_path+"/server/lib/models/models"),
    plugins = require(m.__sys_path+"/server/lib/plugins/plugins"),
    package_translation = require(m.__sys_path+"/server/lib/client/package_translation"),
    package_render = require(m.__sys_path+"/server/lib/client/package_render"),
    client_render = require(m.__sys_path+"/server/lib/client/client_render"),
    Q = require("q"),
    _ = require("underscore")
;

m.errorize = function(res,statusCode,message){
    res.statusCode = statusCode;
    res.set("Content-Type","text/javascript");
    res.end(JSON.stringify({error: message,statusCode: statusCode}));
}

function init_server(next){
    next = next || function(){}
    m.__plugins = {}
    m.__plugins[""] = m;
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
                            next();
                        },function(e){ throw Error("Models load error!");})
                },function(e){ throw Error("Plugins load error!");})
        },function(){ throw Error("Database load error!");});
    return this;
}

module.exports = {
    init: init_server,
    compile_client: client_render,
    package_render: package_render,
    package_translation: package_translation,
    middleware: function(req,res,next){next();},
    api_proc: api_router,
    docs: doc_router
}