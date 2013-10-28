
var server = require("../../app");
m.cfg.server_mode = "production";
server.listen(8000,"127.0.0.1");

var zombie = require("zombie");
server.started = function(){
    zombie.visit("http://127.0.0.1:8000",function(){});
}


