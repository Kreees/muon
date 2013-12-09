var superagent = require('superagent');

describe('User API',function(){
    var test_user;
    before(function(done){
        var User = m.models['user.user'];
        user = new User({nick:'prikha'});
        user.save().done(function(user){
            test_user = user;
            done();
        });
    })

    it('should return collection on GET /apis/user.user?muon', function(done){
        var agent = superagent.agent();
        agent.get('http://localhost:8000/apis/user.user?muon')
            .end(function(err,res){
                should.not.exist(err);
                res.status.should.eql(200);
                res.headers['content-type'].should.match(/application\/json/);
                m.log(res);
                res.body.length.should.equal(0);
                done();
            })
    });

})