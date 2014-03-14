var request = require('supertest');

var test_user;


var clearUsers = function(done) {
    var User = m.models['user'];
    User.find().remove(done);
}

before(function(done) {
   this.server = m.server().listen(8000,"localhost",done);
});

before(function(done) {
    var User = m.models['user'];
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


describe('.hasManyRelations', function(){
    it('should return projects', function(done){
        var User = m.models.user
        m.utils._.keys(User.hasManyRelations).should.include('projects')
        done();
    })
})

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

describe('Scope',function(){
    before(function(done){
        var User = m.models['user'];
        var user = new User({nick:'neila', sex: false});
        user.save(function(){
            test_user = user;
            done();
        });
    });

    describe('female',function(){
        it('should return collection with query applied', function(done){
            request('http://localhost:8000')
                .get('/apis/user/female?muon')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err,res){
                    if(err){ return done(err) }
                    collection = res.body;
                    collection.should.be.instanceOf(Array);
                    var genders = collection.map(function(a){return a.sex});
                    genders.every(function(a){return !a.sex}).should.be.true;
                    done();
                })
        });
        xit('should not respond to actions blocked by permission')
    });
});

describe('Special object', function(){
    describe('one', function(){
        it('should return valid user', function(done){
            request('http://localhost:8000')
                .get('/apis/user/one?muon')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err,res){
                    if(err){ return done(err) }
                    resource = res.body
                    m.utils._.keys(resource).should.include('nick', 'sex')
                    done();
                })
        });

         describe('associations', function(){
             xit('get projects', function(done){return done});
         })
    })
});

describe('Permissions', function(){
    describe('permitted', function(){
        it('should be 200', function(done){
            request('http://localhost:8000')
                .get('/apis/user?muon&__action__=permitted')
                .expect(200, done)
        });
    });

    describe('fobidden', function(){
       it('should be 404', function(done){
           request('http://localhost:8000')
               .get('/apis/user/muon?muon&__action__=forbidden')
               .expect(403, done)
       });
    });

});

xdescribe('Association', function(){

    var finished_project;
    var unfinished_project;

    before(function(done){
        var Project = m.models['project'];
        finished_project = new Project()

        finished_project.name = 'finished';
        finished_project.finished = true;
        test_user.addProjects(finished_project,function(){
            finished_project.save(done);
        });
    });
    before(function(done){
        var Project = m.models['project'];
        unfinished_project = new Project();

        unfinished_project.name = 'unfinished';
        unfinished_project.finished = false;

        test_user.addProjects(unfinished_project,function(){
            unfinished_project.save(done);
        });

    });

    describe('#index', function(){
        it('should return collection', function(done){
            request('http://localhost:8000')
                .get('/apis/user/'+test_user._id+'/projects?muon')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err,res){
                    if(err){ return done(err) }
                    res.body.should.be.instanceOf(Array);
                    res.body.length.should.eq(2);
                    done();
                })
        });
    });
    describe('#show', function(){
        it('should return resource', function(done){
            request('http://localhost:8000')
                .get('/apis/user/'+test_user._id+'/projects/'+finished_project._id+'?muon')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err,res){
                    if(err){ return done(err) }
                    resource = res.body
                    resource.should.be.instanceOf(Object);
                    resource._id.should.be.equal(finished_project._id);
                    m.utils._.keys(resource).should.include('name', 'finished')
                    done();
                })
        });
    });
    describe('#create', function(){
        it('should create resource', function(done){
                request('http://localhost:8000')
                    .post('/apis/user/'+test_user._id+'/projects/?muon')
                    .send({ name: 'project name'})
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err,res){
                        if(err){ return done(err) }
                        resource = res.body;
                        resource._id.should.not.eq(null);
                        test_user.projects.count(function(err, count){
                            if(err){return done(err)}
                            count.should.eq(3)
                            done();
                        });
                    })
            }
        );
    });
    describe('#update', function(){
        it('should change existing resource', function(done){
                request('http://localhost:8000')
                    .put('/apis/user/'+test_user._id+'/projects/'+finished_project._id+'?muon')
                    .send({ name: 'new project name', finished: true})
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .end(function(err,res){
                        if(err){ return done(err) }
                        resource = res.body;
                        resource.name.should.equal('new project name');
                        resource.finished.should.equal(true);
                        done();
                    })
            }
        );
    });
    describe('#delete', function(){
        it('should create resource', function(done){
            request('http://localhost:8000')
                .del('/apis/user/'+test_user._id+'/projects/'+finished_project._id+'?muon')
                .expect('Content-Type', /json/)
                .expect(200)
                .end(function(err,res){
                    if(err){ return done(err) }
                    resource = res.body;
                    var User = m.models['user']
                    User.get(resource._id,function(user){
                        user.code.should.equal(2)
                        test_user.projects.count(function(err,count){
                            if(err){ return done(err) }
                            count.should.equal(1);
                            done()
                        });
                    })
                })
        });
    });
});



after(function(done) { clearUsers(done); });

after(function(done) { this.server.close(done); });