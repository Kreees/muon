/**
 * Model manager - module for declaring models and all related subparts,
 * like ORM/Database, helpers for that utilised by models
 */

module.exports = function(self,deps){
    var _ = require("underscore");
    var Q = require("q");
    function DatabaseNameIsNotDefined(){}
    DatabaseNameIsNotDefined.prototype = new Error();

    var databases = {};
    var dbLoadModule = self.require("database");

    var cfg = deps.config.load();

    return {
        getDatabase: function(dbName){
            var dfd = Q.defer();
            if (dbName in cfg.db){
                if (dbName in databases){
                    _.defer(_.partial(dfd.resolve,databases[dbName]));
                    return dfd.promise;
                }
                dbLoadModule(dbName,cfg.db[dbName]).then(function(db){
                    databases[dbName] = db;
                    dfd.resolve(db);
                },dfd.reject).done();
            }
            else deps.logger.exception("There is no database with '"+dbName+"' name defined in project config.");
            return dfd.promise;
        },
        DatabaseNameIsNotDefined: DatabaseNameIsNotDefined
    }

}