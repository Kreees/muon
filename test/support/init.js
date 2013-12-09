global.server = require('../../module').server;

describe('init',function(){
    it('should start the server',function(done){
        server().onready = done;
    })
})