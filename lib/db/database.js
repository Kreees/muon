var url = require("url");
var fs = require("fs");
var orm_ts = require("orm-timestamps");
var orm_paging = require("orm-paging");
var orm = m.utils.orm;
var Q = m.utils.Q;
var util = m.utils.util;
var querystring = m.utils.querystring

function getConnectionString(config) {
    var protocol = config.type || "sqlite";
    var query;
    m.utils._.defaults(config, {
        user     : { postgres: 'postgres', redshift: 'postgres', mongodb: '' }[protocol] || 'root',
        database : { mongodb:  'test'     }[protocol] || 'orm_test',
        password : '',
        host     : 'localhost',
        pathname : '',
        query    : {}
    });

    if(!config.pathname.match(/^\//) && config.type == "sqlite")
        config.pathname = m.cfg.path +"/"+config.pathname;

    query = querystring.stringify(config.query);

    switch (protocol) {
        case 'mysql':
        case 'postgres':
        case 'redshift':
        case 'mongodb':
            return util.format("%s://%s:%s@%s/%s?%s",
                protocol, config.user, config.password,
                config.host, config.database, query
            ).replace(':@','@');
        case 'sqlite':
            return util.format("%s://%s?%s", protocol, config.pathname, query);
        default:
            throw new Error("Unknown protocol " + protocol);
    }
};

var MuonORMPlugin = function(){
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
        if (typeof m.databases == "object") return m.utils._.defer(dfd.resolve);
        m.databaseClients = m.databaseClients || [];
        m.databases = [];
        while(m.databaseClients.length != 0){
            m.databaseClients.shift().close();
        }
        var dbNames = [];
        if (!m.cfg.db || m.utils._.isEmpty(m.cfg.db)) return m.utils._.defer(dfd.resolve);        
        for(var i in m.cfg.db){
            dbNames.push(i);
            (function(dbName){
                orm.connect(getConnectionString(m.cfg.db[dbName]),function(err,db){
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