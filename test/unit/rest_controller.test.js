describe('REST controller', function(){
    var Mocha = this;

    var User,OtherUser, rest;

    before(function(done){
        User = m.models['user']
        OtherUser = m.models['other_user']
        rest = m.rest;
        done();
    });

    var clearModels = function(done){
        async.parallel([
            User.find({}).remove,
            OtherUser.find({}).remove,
        ],function(err){
            if(err){throw err};
            done();
        });
    }

    beforeEach(clearModels);
    after(clearModels);

    xdescribe('action GET', function(){
        var testUser;
        before(function(done){
            testUser = new User();
            testUser.save({ nick:'prikha' },function(err){
                if (err) throw err;
                done();
            });
        });
        it("should be present", function(done){
            rest.actions.should.have.property('get');
            done();
        })
        it("should respond with valid object",function(done){
            var req = httpMock.createRequest({
                model: User,
                controller: rest,
                value: testUser._id,
                target: User
            });
            var res = httpMock.createResponse();
            var ret = rest.actions.get.apply(req.context,[req,res,testUser._id]);
            Q.when(ret).done(function(user){
                user.should.eql(testUser);
                done();
            });
        })
    });

    xdescribe('action INDEX', function(){
        var testUsers = [],result;
        before(function(done){
            for(var i = 0; i < 10; i++){
                testUsers.push(new User());
                testUsers[i].nick = "user"+(i+1);
            }
            async.parallel(m._.pluck(testUsers,"save"),done);
        });
        before(function(done){
            var req = httpMock.createRequest({
                model: User,
                target: User,
                controller: rest
            });
            var res = httpMock.createResponse();
            var ret = rest.actions.index.apply(req.context,[req,res]);
            Q.when(ret).done(function(data){
                result = data;
                done();
            });
        });
        it("should be present",function(done){
            rest.actions.should.have.property('index');
            done();
        })
        it("should respond with collection", function(done){
            result.should.eql(testUsers);
            done();
        })
    });

    xdescribe('action SEARCH', function(){
        var testUsers = [],result;
        before(function(done){
            var users = [];
            for(var i = 0; i < 10; i++){
                users.push(new User());
                users[i].nick = "user"+(i+1);
            }
            testUsers = users.slice(1,3);
            async.parallel(m._.pluck(users,"save"),done);
        });
        before(function(done){
            var req = httpMock.createRequest({
                model: User,
                target: User,
                controller: rest,
                data: {
                    nick: ["user2","user3"]
                }
            });
            var res = httpMock.createResponse(function(){});
            var ret = rest.actions.search.apply(req.context,[req,res]);
            Q.when(ret).done(function(data){
                result = data;
                done();
            });
        });
        it("should be present",function(done){
            rest.actions.should.have.property('search');
            done();
        })
        it("should respond with collection", function(done){done();});
    });

    xdescribe('action CREATE', function() {
        var testUser,refUser,result;
        before(function(done){
           refUser = new OtherUser();
           refUser.save(function(){
                done();
           })
        });

        before(function(done){
            var req = httpMock.createRequest({
                model: User,
                target: User,
                controller: rest,
                data: {
                    nick: "some",
                    email: "some@some.some",
                    password: "some",
                    wrong: "some",
                    parent:refUser._id,
                    dummies: [refUser._id]
                }
            });
            var res = httpMock.createResponse();
            var ret = rest.actions.create.apply(req.context,[req,res]);
            Q.when(ret).done(function(data){
                result = data;
                User.find({},function(e,a){
                    testUser = a[0];
                    done();
                });
            });
        });

        var relations;
        before(function(done){
           testUser.getDummies(function(e,data){
               relations = data;
               done();
           })
        });

        it('should be present', function() {
            rest.actions.should.have.property('create');
        });
        it('result should have properties',function(){
            result.should.have.property("nick");
            result.should.have.property("email");
            result.should.have.property("password");
            result.should.have.property("parent_id");
            result.should.not.have.property("wrong");
        });
        it('should create record', function(){
            result.nick.should.be.eql("some");
            result.email.should.be.eql("some@some.some");
            result.password.should.be.eql("some");
        });
        it("result should match to returned object",function(){
            result.nick.should.have.be.eql(testUser.nick);
            result.email.should.have.be.eql(testUser.email);
            result.password.should.have.be.eql(testUser.password);
            result.parent_id.should.have.be.eql(testUser.parent_id);
        });
        it("reference should match",function(){
            m._.pluck(relations,"_id").should.be.eql([refUser._id]);
        })
    });

    describe('action EDIT', function() {
        //    save one user as this.existing_user
        var testUser,refUser;
        before(function(done){
            testUser = new User();
            testUser.nick = "before_some";
            testUser.email = "before_some@before_some.before_some";
            testUser.password = "before_some";
            testUser.save(done);
        });
        before(function(done){
            refUser = new OtherUser();
            refUser.save(done);
        })
        before(function(done){
            var req = httpMock.createRequest({
                model: User,
                target: User,
                controller: rest,
                data: {
                    nick: "after_some",
                    password: "after_some",
                    parent: refUser._id,
                    dummies: [refUser._id]
                }
            });
            var res = httpMock.createResponse();
            var ret = rest.actions.edit.apply(req.context,[req,res,testUser._id]);
            Q.when(ret).done(function(data){
                result = data;
                done();
            });
        });

        var relations;
        before(function(done){
            testUser.getDummies(function(e,data){
                relations = data;
                done();
            })
        });

        it('should be present', function () {
            rest.actions.should.have.property('edit');
        });

        it('should change record', function(){
            result.nick.should.be.eql("after_some");
            expect(result.email).to.be.null;
            result.password.should.be.eql("after_some");
            result.parent_id.should.be.eql(refUser._id);
        });
        it("reference should match",function(){
            m._.pluck(relations,"_id").should.be.eql([refUser._id]);
        });
    });

    xdescribe('action REMOVE', function(){
        var testUser,refUser,presentResult;
        before(function(done){
            testUser = new User();
            testUser.nick = "some";
            testUser.password = "some";
            testUser.save(done);
        });
        before(function(done){
            var req = httpMock.createRequest({
                model: User,
                target: User,
                controller: rest,
                data: {
                    email: "other_some",
                    password: "other_some"
                }
            });
            var res = httpMock.createResponse();
            var ret = rest.actions.remove.apply(req.context,[req,res,testUser._id]);
            Q.when(ret).done(function(data){
                result = data;
                done();
            });
        });

        before(function(done){
            User.find({_id:testUser._id},function(err,a){
                presentResult = a;
                done();
            })
        })

        it('should be present', function () {
            rest.actions.should.have.property('edit');
        });

        it('should change record', function(){
            result.nick.should.be.eql("some");
            result.password.should.be.eql("some");
            expect(result.email).to.be.null;
        });
        it("reference should match",function(){
            presentResult.length.should.be.eql(0)
        });
    });
})




