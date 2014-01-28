var path = require("path");

var m = global.m = {};

m.__syspath = path.normalize(__dirname+"/../");
m.cfg = require('./load_config.js')(global.__mcfg__ || {});
m.path = m.cfg.path;
m._ = require("underscore");
m.Q = require("q");
m.orm = require("orm");
m.enforce = m.orm.enforce;

require("./console");
require("./kill");

var db = require(m.__syspath+"/lib/utils/db/database"),
    models = require(m.__syspath+"/lib/models/models"),
    plugins = require(m.__syspath+"/lib/plugins/plugins"),
    Q = require("q"),
    _ = require("underscore")

m.models = {}, m.plugins = {}, m.__plugins = {}, m.__plugins[""] = m;

var readyStack = [];
m.__serverInit__ = true;

m.ready = function(callback){
    if (!_.isFunction(callback)) throw Error("Callback is not a function");
    if (!m.__serverInit__) return callback.call(m);
    else readyStack.push(callback);
};

m.reload = function(objCfg,next){
    if (_.isFunction(objCfg) && !next) {
        next = objCfg;
        objCfg = {};
    }
    m.__serverInit__ = true;
    
    for(var i in require.cache){
        if (i.lastIndexOf(path.normalize(m.__syspath+"/muon/node_modules")) == -1)
            if (i == __filename) continue;
        delete require.cache[i];
    }

    for(var i in objCfg) m.cfg[i] = objCfg[i];
    
    var next = next || function(){}
    m.models = {}, m.plugins = {}, m.__plugins = {}, m.__plugins[""] = m;

    Q.when(db.init()).then(
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
                                m.getModel = models.getModel;
                                m.__serverInit__ = false;
                                next();
                                for(var i = 0, len = readyStack.length; i < len; i++)
                                    readyStack.shift().call(m);
                            },function(e){ throw Error("Models load error.");}).done()
                    }
                    catch(e){m.kill(e);}
                },function(e){m.kill(e);}).done()
        },function(){ m.kill("Database load error.");}).done();
};

m.reload();

module.exports = m;