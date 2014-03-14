module.exports = require("./lib/init");

module.exports.server = function() { return require("./lib/server.js") };
module.exports.plugin = function() { return require("./lib/plugin.js") };