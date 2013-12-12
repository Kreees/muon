module.exports = require("./lib/__init__");

module.exports.server = function(cfg) { return require("./lib/server.js") };
module.exports.plugin = function() { return require("./lib/plugin.js") };