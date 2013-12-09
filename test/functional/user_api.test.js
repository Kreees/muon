var superagent = require('superagent');
var http = require("http");
describe('User API',function(){
    var test_user;
    var serv = http.createServer(global.serverHandler);
    before(function(done){
        var User = m.models['user.user'];
        var user = new User({nick:'prikha'});
        user.save().done(function(user){
            test_user = user;
            serv.listen(8000,"localhost",done);
        });


    });

    after(function(done){
        m.log('after')
        serv.close();
        var User = m.models['user.user'];
        User.db.find().done(function(query_set){
            query_set.del().done(function(){done()})});
    })


    it('should return collection on GET /apis/user.user?muon', function(done){
        var agent = superagent.agent();
//        http.get("http://0.0.0.0:8000/apis/user.user/?muon",function(res){
//            console.log(res.statusCode);
//            done();
//        })
        agent.get('http://0.0.0.0:8000/apis/user.user?muon')
            .end(function(err,res){
                console.log(arguments);
                should.not.exist(err);
                res.status.should.eql(200);
                res.headers['content-type'].should.match(/application\/json/);
                res.body.length.should.equal(1);
                m.log('======');
                m.log(test_user);
                m.log(res.body);
                done();
            })
    });

})