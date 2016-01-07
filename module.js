var path = require("path");
var EventEmitter = require("events").EventEmitter;
var _ = require("underscore");
var Q = require("q");
var util = require("util");

function Muon(){
    EventEmitter.apply(this,arguments);
}
util.inherits(Muon,EventEmitter);

var mCache = {};

var Module = function(alias,cb){
    alias = alias || "";

    if (mCache.hasOwnProperty(alias)){
        var m = mCache[alias];
        if (_.isFunction(cb)){
            m.ready(cb);
        }
        return m;
    }

    var m = new Muon();
    mCache[alias] = m;
    var sys = require("./lib/sys")(m);
    m.sys = sys;

    var readyStack = [];
    var beforeReloadStack = [];

    m.ready = function(callback){
        if (!_.isFunction(callback)) {
            throw Error("Callback is not a function");
        }

        if (!sys.mInitFlag) {
            return _.defer(callback);
        } else {
            readyStack.push(callback);
        }
    };

    if (_.isFunction(cb)){
        m.ready(cb);
    }

    m.beforeReload = function(callback){
        if (!_.isFunction(callback)) {
            throw Error("Callback is not a function");
        } else {
            beforeReloadStack.push(callback);
        }
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
            }).catch(function(e){
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
    return m;
}

Module.loaded = function(alias) {
    alias = alias || "";
    return mCache.hasOwnProperty(alias);
}

module.exports = Module;