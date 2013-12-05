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

function initServer(next){
    var next = next || function(){}
    m.__plugins = {}
    m.__plugins[""] = m;
    m.__serverInit__ = true;
    Q.when(db.init("mongodb://"+m.cfg.dbHost+"/"+m.cfg.dbName)).then(
        function(){
            m.plugins = {};
            plugins.init(m.cfg).then(
                function(a){
                    for(var i in a){
                        if (i in m.__plugins) continue;
                        m.__plugins[i] = a[i];
                        m.plugins[i] = a[i];
                    }
                    try{
                        models.init(m.cfg).then(
                            function(a){

                                for(var i in a) m[i] = a[i];
                                m.__serverInit__ = false;
                                _.defer(next)
                            },function(e){ throw Error("Models load error!");}).done()
                    }
                    catch(e){m.kill(e);}
                },function(e){ throw Error("Plugins load error!");}).done()
        },function(){ throw Error("Database load error!");}).done();
    return this;
}

module.exports = {
    init: initServer,
    compileClient: req("client/client_render"),
    compileMuonJs: req("client/muon_render"),
    packageRender: req("client/package_render"),
    packageView: req("client/package_view"),
    packageTranslation: req("client/package_translation"),
    apiProc: req("router/api_router")
};
