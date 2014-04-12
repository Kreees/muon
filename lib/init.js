var path = require("path");
var EventEmitter = require("events").EventEmitter;

function Muon(){}
Muon.prototype = new EventEmitter();
var m = global.m = new Muon();

/* Base global properties fixed during lunch */

Object.defineProperty(m,"cfg",{value: require('./config.js')(global.__mcfg__ || {})});
Object.defineProperty(m,"sys",{value: require("./sys")});
Object.defineProperty(m,"utils",{value: require("./utils")});

/* Properties should be reloaded be m.reload */

var readyStack = [];
var beforeReloadStack = [];

m.ready = function(callback){
    if (!m.utils._.isFunction(callback)) throw Error("Callback is not a function");
    if (!m.sys.mInitFlag) return callback.call(m);
    else readyStack.push(callback);
};

m.beforeReload = function(callback){
    if (!m.utils._.isFunction(callback)) throw Error("Callback is not a function");
    else beforeReloadStack.push(callback);
}

m.reload = function(objCfg,next){
    /* Run hooks before loading new environment*/

    for(var i = 0, len = beforeReloadStack.length; i < len; i++)
        beforeReloadStack.shift().call(m);

    /* Parse arguments */

    if (m.utils._.isFunction(objCfg) && !next) {
        next = objCfg;
        objCfg = {};
    }

    /* Clearing cache by required modules (allows to run modules with another server mode) */

    for(var i in require.cache){
        if (i.lastIndexOf(path.normalize(m.sys.path+"/muon/node_modules")) == -1)
            if (i == __filename) continue;
        delete require.cache[i];
    }
    for(var i in objCfg) m.cfg[i] = objCfg[i];
    var next = next || function(){};

    /* Loading application */

    m.sys.loadMode(m.cfg.serverMode)
        .then(function(){
            /* Launch hooks and emit event before proceed */
            m.emit("ready");
            for(var i = 0, len = readyStack.length; i < len; i++)
                readyStack.shift().call(m);
            /* Proceed */
            setTimeout(next,0);
        })
        .fail(function(e){
            m.kill("Fail to init muon.",e);
        })
        .done();
};

setTimeout(m.reload,0);
module.exports = m;