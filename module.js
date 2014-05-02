var path = require("path");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore");
var Q = require("q");
var util = require("util");
function Muon(){}
//util.inherits(Muon,EventEmitter);
Muon.prototype = new EventEmitter();
var m = global.m = new Muon();

/* Base global properties fixed during lunch */

var sys = require("./lib/sys");
m.sys = sys;

/* Properties should be reloaded be m.reload */

var readyStack = [];
var beforeReloadStack = [];

m.ready = function(callback){
    if (!_.isFunction(callback)) throw Error("Callback is not a function");
    if (!sys.mInitFlag) return _.defer(callback.bind(m));
    else readyStack.push(callback);
};

m.beforeReload = function(callback){
    if (!_.isFunction(callback)) throw Error("Callback is not a function");
    else beforeReloadStack.push(callback);
}

function reload(objCfg,cb){
    return sys.reload()
        .then(_.partial(sys.loadModule,"config"))
        .then(function(modCfg) {
            /* Load config  */
            var cfg = modCfg.load(objCfg || global.__mcfg__);

            /* Run hooks before loading new environment*/
            while(beforeReloadStack.length != 0){
                beforeReloadStack.shift().call();
            }

            /* Clearing cache by required modules (allows to run modules with another server mode) */
            for (var i in objCfg) cfg[i] = objCfg[i];
            return [cfg.serverMode,cfg.path];
        })
        .spread(sys.loadMode)
        .then(function(){
            /* Launch hooks and emit event before proceed */
            m.emit("ready");
            while(readyStack.length != 0){
                readyStack.shift().call();
            }
            /* Proceed */
            setTimeout(cb,0);
        }).fail(function(e){
            console.error((e instanceof Error)?e.stack:e);
            process.exit();
        });
}

m.reload = function(objCfg,cb){
    if (_.isFunction(objCfg) && !cb) {
        cb = objCfg || function(){};
        objCfg = undefined;
    }

    if (sys.mInitFlag){
        if (objCfg) console.error("Ignore reload config params until M will be fully initialized.");
        var dfd = Q.defer();
        m.once("ready",function(){
            cb &&   cb();
            dfd.resolve();
        });
        return dfd.promise;
    };
    return reload(objCfg,cb);
};

setTimeout(reload,0);
module.exports = m;