var http = require("http");

module.exports = function(address){
    var domain = address.split(":")[0];
    var port = address.split(":")[1];
    function request(path,dataToSend,callback){
        dataToSend = JSON.stringify(dataToSend)+"\r\n";
        var req = http.request({
            hostname: domain,
            port: port,
            path: path,
            method: "POST",
            headers: {
                "Content-Length": dataToSend.length,
                "Content-Type": "text/plain;charset=UTF-8"
            }
        },function(res){
            var data = "";
            res.on("data",function(d){
                data += d.toString("utf8");
            });
            res.on("end",function(){
                try {data = JSON.parse(data)}
                catch(e){}
                callback && callback(data);
            });
        });
        req.write(dataToSend);
        req.end();
    }
    request("/",{"some":"other"},function(data){
       console.log(data)
       console.log("exiting...");
       process.exit();
    });
}