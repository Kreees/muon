var path = require("path");

var EventEmitter = require("events").EventEmitter;



function Muon(){}

Muon.prototype = new EventEmitter();

var m = global.m = new Muon();

m.sys = require("./modules/sys");
m.cfg = m.sys.require('/config/load_config.js')(global.__mcfg__ || {});
m.utils = m.sys.require("/modules/utils");
m.lib = m.sys.require("/modules/lib");
m.sys.require("/modules/console");
m.sys.require("/modules/kill");

if (m.cfg.serverMode == 'testing')
    m.testing = m.sys.require("/modules/test");

var db = m.sys.require("/db/database"),
    models = m.sys.require("/app/models/models"),
    loadPlugin = m.sys.require("/app/plugins/loadPlugin");

m.__plugins = {},
m.__plugins[""] = m;

m.require = function(arg){
    return require(path.normalize(m.cfg.path+"/"+arg));
}

var readyStack = [];
var beforeReloadStack = [];

m.ready = function(callback){
    if (!m.utils._.isFunction(callback)) throw Error("Callback is not a function");
    if (!m.sys.serverInitFlag) return callback.call(m);
    else readyStack.push(callback);
};

m.beforeReload = function(callback){
    if (!m.utils._.isFunction(callback)) throw Error("Callback is not a function");
    else beforeReloadStack.push(callback);
}

m.reload = function(objCfg,next){
    for(var i = 0, len = beforeReloadStack.length; i < len; i++)
        beforeReloadStack.shift().call(m);
    if (m.utils._.isFunction(objCfg) && !next) {
        next = objCfg;
        objCfg = {};
    }
    m.sys.serverInitFlag = true;
    
    for(var i in require.cache){
        if (i.lastIndexOf(path.normalize(m.sys.path+"/muon/node_modules")) == -1)
            if (i == __filename) continue;
        delete require.cache[i];
    }

    for(var i in objCfg) m.cfg[i] = objCfg[i];
    
    var next = next || function(){}

    m.__plugins = {};
    m.utils.Q.when(db.init()).then(
        function(){
            m.app = {};
            loadPlugin.init(m.cfg).then(function(scope){
                m.app = scope;
                m.__plugins[""] = m.app;
                m.sys.serverInitFlag = false;
                next();
                m.emit("ready");
                for(var i = 0, len = readyStack.length; i < len; i++)
                    readyStack.shift().call(m);
            },function(){
                m.kill("Can't load plugin.");
            }).done();
        },function(){ m.kill("Database load error.");}).done();
};

m.utils._.defer(m.reload);
module.exports = m;