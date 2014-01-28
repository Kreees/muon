var path = require('path');

// Тестирование lib/models/models.js

// модуль

xdescribe('MODELS module', function(){
    before(function(){
        this.models = require('../../lib/models/models');
        this.cfg = {path: path.resolve('./test/fixtures')};
    })

    it('should return an instance of new model', function(done){
        this.models.init(this.cfg).done(function(models){
            done();
        });
    })


})

