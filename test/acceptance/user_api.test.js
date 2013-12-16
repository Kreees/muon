var superagent = require('superagent');
//var http = require("http");

describe('User API',function(){
    var test_user;

   before(function(){
       this.server = m.server().listen(8000,"localhost");
   })

//        drop database
    before(function(done){
        db = m.__databases.default;
        db.dropDatabase(function(err){
            if(err){throw err};
            done();
        });
    });

    before(function(done){
        var User = m.models['user.user'];
        var user = new User({nick:'prikha'});
        user.save().done(function(user){
            test_user = user;
            m.log(test_user);
            done();
        });
    });

    after(function(done){
        var User = m.models['user.user'];
        User.db.find().done(function(query_set){
            query_set.del().done(function(){done()})});
    });

    after(function(){
        this.server.close();
    });

    it('should return collection on GET /apis/user.user?muon', function(done){
        var agent = superagent.agent();
        agent.get('http://0.0.0.0:8000/apis/user.user?muon')
            .end(function(err,res){
                should.not.exist(err);
                res.status.should.eql(200);
                res.headers['content-type'].should.match(/application\/json/);
                res.body.length.should.equal(1);
                done();
            })
    });

    it('should return user on GET /apis/user.user/:id?muon',function(done){
        var agent = superagent.agent();
        var path = 'http://0.0.0.0:8000/apis/user.user/'+test_user.id+'?muon';
        m.log(path);
        agent.get(path)
            .end(function(err,res){
                should.not.exist(err)
                res.status.should.eql(200);

                //TODO: assert equality of users retrieved
                m.log(res.body);
                done();
            });


    })

})