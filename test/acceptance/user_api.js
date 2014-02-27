var request = require('supertest');

var test_user;


var clearUsers = function(done){
    var User = m.models['user'];
    User.find().remove(done);
}

before(function(done) {
   this.server = m.server().listen(8000,"localhost",done);
});

before(function(done) {
    var User = m.models['user'];
    User = m.models['user'];
    done();
});

before(function(done) { clearUsers(done); });

before(function(done){
    var User = m.models['user'];
    var user = new User({nick:'prikha'});
    user.save(function(){
        test_user = user;
        done();
    });
});

describe('REST', function(){
    describe('#index', function(){
        it('should return collection', function(done){
            request('http://localhost:8000')
                .get('/apis/user?muon')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err,res){
                    if(err){ return done(err) }
                    res.body.should.be.instanceOf(Array);
                    res.body.length.should.eq(1);
                    res.body[0]["_id"].should.eq(test_user._id);
                    done();
                })
            });
    });
    describe('#show', function(){
        it('should return resource', function(done){
                request('http://localhost:8000')
                    .get('/apis/user/'+test_user._id+'?muon')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err,res){
                        if(err){ return done(err) }
                        resource = res.body
                        resource.should.be.instanceOf(Object);
                        resource._id.should.be.equal(test_user._id);
                        m.utils._.keys(resource).should.include('nick', 'sex')
                        done();
                    })
            });
    });
    describe('#create', function(){
        it('should create resource', function(done){
                request('http://localhost:8000')
                    .post('/apis/user/?muon')
                    .send({ nick: 'Kirill'})
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err,res){
                        if(err){ return done(err) }
                        resource = res.body;
                        resource._id.should.not.eq(null);
                        done();
                    })
            }
        );
    });
    describe('#update', function(){
        it('should change existing resource', function(done){
                request('http://localhost:8000')
                    .put('/apis/user/'+test_user._id+'?muon')
                    .send({ nick: 'Sergey'})
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err,res){
                        if(err){ return done(err) }
                        resource = res.body;
                        resource.nick.should.equal('Sergey');
                        resource.modified_at.should.not.equal(test_user.modified_at)
                        resource.created_at.should.not.equal(test_user.created_at)
                        done();
                    })
            }
        );
    });
    describe('#delete', function(){
        it('should create resource', function(done){
                request('http://localhost:8000')
                    .del('/apis/user/'+test_user._id+'?muon')
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err,res){
                        if(err){ return done(err) }
                        resource = res.body;
                        var User = m.models['user']
                        User.get(resource._id,function(user){
                            user.code.should.equal(2)
                            done();
                        })
                    })
            });
    });
});

after(function(done) { clearUsers(done); });

after(function(done) { this.server.close(done); });