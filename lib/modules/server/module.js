/* Defining interface of server module */

module.exports = function(self,deps){
    var appCfg = deps.config.load();
    var Q = require("q");
    return {
        __init__: function(){
            var srv;
            if (typeof appCfg.secure == "object"){
                deps.logger.exception("HTTPS server is not implemented yet");
            }
            else srv = self.createServer()
            return Q().then(srv.listen(8000,"0.0.0.0"));
        },
        createServer: function(){
            var app = deps.express.newApp();
            self.require("configure/baseConfig")(app);
            self.require("configure/config")(app);
            return require("http").createServer(app);
        },
        createSecureServer: function(options){
            var app = deps.express.newApp();
            self.require("configure/baseConfig")(app);
            self.require("configure/config")(app);
            return require("https").createServer(options,app);
        }
    }
}