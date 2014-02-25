var superagent = require('superagent');
var request = require('supertest');

var test_user;
var agent = superagent.agent();

before(function(done){
   this.server = m.server().listen(8000,"localhost",done);
})

before(function(done){
    var User = m.models['user'];
    User.find().remove(done);
});

before(function(done){
    var User = m.models['user'];
    console.log(m.utils._.keys(m.models));
    var user = new User({nick:'prikha'});
    user.save(function(){
        test_user = user;
        done();
    });
});


//after(function(done){
//    User.find().done(function(query_set){
//        query_set.del().done(function(){done()})});
//});

after(function(done){
    this.server.close(done);
});

describe('REST', function(){
    describe('#index', function(){
        it('should return json', function(done){
            request('http://localhost:8000')
                .get('/apis/user?muon')
                .expect('Content-Type', /json/)
                .expect ([test_user])
                .expect(200, done);
        });

//        it('should be success', function(done){
//            agent.get('http://0.0.0.0:8000/apis/user?muon')
//                .end(function(err,res){
//                    should.not.exist(err);
//
//                    res.status.should.eql(200);
//                    res.headers['content-type'].should.match(/application\/json/);
//                    console.log("=========");
//                    console.log(m.utils._.keys(res.body));
//                    console.log("=========");
//
//                    done();
//                })
//        });
    });

});

