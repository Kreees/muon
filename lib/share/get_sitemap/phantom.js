var port = 8001;
var sys = require("system");
var server = require("webserver").create();

var server_proc = require(phantom.libraryPath+"/phantom_server").launch(server);
(function launch(){
    try {
        server.listen(port,server_proc);
        console.log("127.0.0.1:"+port);
    }
    catch(e){
        port++;launch();
    }
})();


