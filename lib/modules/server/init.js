/* Defining interface of server module */

var server = {};

function ServerIntance(){}

function createServer(callback){
}

/* ServerIntance */

function listen(host,port,callback){

}

function close(){

}

Object.defineProperty(ServerIntance.prototype,'listen',{value: listen});
Object.defineProperty(ServerIntance.prototype,'close',{value: close});



exports.common = function(){

}

exports.production = function(){

}
