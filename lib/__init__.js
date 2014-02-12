var path = require("path");

var m = global.m = {};

m.__syspath = path.normalize(__dirname+"/../");
m.cfg = require('./load_config.js')(global.__mcfg__ || {});
m.path = m.cfg.path;

m.utils = require("./utils");

require("./console");
require("./kill");

m.__require__ = function(a){ return require(path.normalize(m.__syspath+"/lib/"+a)); };

var db = m.__require__("/utils/db/database"),
    models = m.__require__("/models/models"),
    plugins = m.__require__("/plugins/plugins"),
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