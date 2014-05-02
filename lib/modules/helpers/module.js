/**
 * Model manager - module for declaring models and all related subparts,
 * like ORM/Database, helpers for that utilised by models
 */

module.exports = function(self){
    return {
        initScope: self.require("lib/initScope")
    }
}