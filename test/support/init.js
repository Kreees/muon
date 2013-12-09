global.serverHandler = require('../../module').server();

describe('init',function(){
    it('should start the server',function(done){
        serverHandler.onready = done;
    })
})