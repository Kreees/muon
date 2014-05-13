module.exports = function(self,deps){
    var url = require("url");
    var fs = require("fs");
    var orm_ts = require("orm-timestamps");
    var orm = require("orm");
    var Q = require("q");
    var util = require("util");
    var path = require("path");
    var _ = require("underscore");
    var querystring = require("querystring");

    var cfg = deps.config.load();

    var driverName = {
        'mysql':'mysql',
        'postgres':'pg',
        'redshift':'pg',
        'mongodb':'mongodb',
        'sqlite':'sqlite3'
    }

    var MuonORMPlugin = function(){
        return {
            beforeDefine: function(name,attrs,opts){
                opts.timestamp = true
                opts.hooks = opts.hooks || {};
            }
        }
    };

    function getConnectionString(config) {
        var query;
        var protocol = config.type;

        if(!config.pathname.match(/^\//) && config.type == "sqlite")
            config.pathname = cfg.path +"/"+config.pathname;

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

    return function(dbName,dbConfig){
        var dfd = Q.defer();

        var localPath = path.normalize(cfg.path+"/node_modules/"+driverName[dbConfig.type]);
        var sysPath = path.normalize(self.syspath+"/node_modules/"+driverName[dbConfig.type]);

        if (!fs.existsSync(sysPath)){
            if (fs.existsSync(localPath)) fs.linkSync(localPath,sysPath);
            else deps.logger.exception("You should install appropriate database driver\n" +
                    "For additional info visit: https://github.com/dresende/node-orm2/wiki/Connecting-to-Database");
        }
        orm.connect(getConnectionString(dbConfig),function(err,db){
            if (err) return dfd.reject(err);
            db.use(MuonORMPlugin);
            db.use(orm_ts);
            dfd.resolve(db);
        });
        return dfd.promise;
    }
};