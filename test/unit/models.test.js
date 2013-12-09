global.m = require('../../lib/m_init');
var path = require('path');


xdescribe('MODELS module', function(){
    before(function(){
        this.models = require('../../server/lib/models/models');
        this.cfg = {path: path.resolve('./test/fixtures')};
    })

    it('should return an instance of new model', function(done){
        this.models.init(this.cfg).done(function(models){
            console.log(_.keys(models));

            models.modelNames.should.eql(['user']);
            done();
        });
    })


})

