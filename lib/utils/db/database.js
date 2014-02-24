var url = require("url");
var fs = require("fs");
var orm_ts = require("orm-timestamps");
var orm_paging = require("orm-paging");
var orm = m.utils.orm;
var Q = m.utils.Q;

var MuonORMPlugin = function(db){
    function wrapHook(hooks, hookName, postLogic) {
        if(typeof hooks[hookName] == 'function') {
            var oldHook = hooks[hookName];
            hooks[hookName] = function(next) {
                var cont = function() {
                    postLogic.call(this);
                    next();
                }

                var that = this;
                oldHook.call(this, function() {
                    cont.call(that);
                });

                if(oldHook.length == 0) cont.call(this);
            };
        } else {
            hooks[hookName] = postLogic;
        }
    }

    return {
        beforeDefine: function(name,attrs,opts){
            opts.timestamp = true
            opts.hooks = opts.hooks || {};
            wrapHook(opts.hooks,"afterLoad",function(){
                this.__modelName__ = opts.modelName;
                this.__fullName__ = opts.fullName;
                this.__pluginName__ = opts.pluginName;
            });
        }
    }
};

module.exports = {
    init: function(){
        var dfd = Q.defer();
        if (typeof m.databases == "object") return _.defer(dfd.resolve);
        m.databaseClients = m.databaseClients || [];
        m.databases = [];
        while(m.databaseClients.length != 0){
            m.databaseClients.shift().close();
        }
        var dbNames = [];
        for(var i in m.cfg.db){
            dbNames.push(i);
            (function(dbName){
                var descr = m.cfg.db[dbName];
                var connectURL = descr.type+"://";
                if (descr.user){
                    connectURL += descr.user;
                    if (descr.pass) connectURL += ":"+descr.pass;
                    connectURL += "@";
                }
                connectURL += descr.host;
                if (descr.port) connectURL += ":"+descr.port
                connectURL += "/"+descr.name;
                orm.connect(connectURL,function(err,db){
                    if (err) m.kill("Can't connect to database "+dbName+" : "+err);
                    m.databases[dbName] = db;
                    db.use(MuonORMPlugin);
                    db.use(orm_ts);
                    db.use(orm_paging);
                    dbNames.shift();
                    if (dbNames.length == 0) dfd.resolve();
                });
            })(i);
        }
        return dfd.promise;
    }
};