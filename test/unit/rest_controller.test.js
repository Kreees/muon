describe('REST controller', function(){
    var Mocha = this;
//    assign global variables
    before(function(done){
        this.User = m.models['user.user']
        this.rest = m.rest;
        this.db = m.__databases.default;
        done();
    });

//    drop database
    before(function(done){
        this.db.dropDatabase(function(err){
            if(err){throw err};
            done();
        });
    });

    describe('action GET', function(){
        before(function(done){
            var User = this.User;
            user = new User({nick:'prikha'});
            user.save().done(function(user){
                Mocha.test_user = user;
                done();
            });
        });
        it("should be preset", function(){
            this.rest.actions.should.have.property('get');
        })
        it("should respond with valid object",function(done){
            var rest = this.rest;
            var User = this.User;
            test_user = Mocha.test_user;
            var req = {
                context: {
                    model: User,
                    controller: rest,
                    value: test_user.id,
                    target: User
                },
                __compiledWhere__: {}
            }
            var res = {end: function(){}};
            var ret = rest.actions.get.apply(req.context,[req,res,test_user.id]);


            Q.when(ret).done(function(user){
                user.should.eql(test_user);
                done();
            });
        })
    });

    describe('action INDEX', function(){
        before(function(done){
            this.User.db.find().done(function(collection){
                this.test_collection = collection.slice();
                done();
            });
        })
        it("should be present",function(){
            this.rest.actions.should.have.property('index');
        })
        it("should respond with collection", function(done){
            var rest = this.rest;
            var User = this.User;

            var req = {
                context:{
                    model: User,
                    target: User,
                    controller: rest
                },
                __compiledWhere__: {}
            }

            var res = {end: function(){}}

            var ret = this.rest.actions.index.apply(req.context,[req,res,null]);

            Q.when(ret).done(function(collection){
                var data = collection.slice();
                data.should.eql(this.test_collection);
                done();
            });

        })
    });

    describe('action SEARCH', function(){
        before(function(done){
            unique_user = new this.User({nick: 'unique_nickname'});
            unique_user.save().done(function(unique_user){
                Mocha.unique_user = unique_user;
                done();
            });
        });

        before(function(done){
            this.User.db.find().done(function(collection){
                Mocha.test_collection = collection.slice();
                done();
            });
        })
        it("should be present",function(){
            this.rest.actions.should.have.property('search');
        })
        it("should respond with collection", function(done){
            var rest = this.rest;
            var User = this.User;

            var req = {
                context:{
                    model: User,
                    target: User,
                    controller: rest,
                    data: {
                        nick: 'unique_nickname'
                    }
                },
                __compiledWhere__: {}
            }

            var res = {end: function(){}}

            var ret = this.rest.actions.search.apply(req.context,[req,res,null]);

            Q.when(ret).done(function(collection){
                var data = collection.slice();
                data.length.should.eql(1);
                done();
            });

        })
    });

    describe('action CREATE', function() {
        before(function(done){
            this.User.db.raw.count(function(err,count){
                if(err){throw err;}
                this.before_user_count = count;
                done();
            });
        });
        it('should be present', function () {
            this.rest.actions.should.have.property('create');
        })
        it('should create record', function(done){
            var rest = this.rest;
            var User = this.User;
            var test_user = {nick: 'create_test_user',email: 'test@email.com'};
            var req = {
                context: {
                    model: User,
                    target: User,
                    controller: rest,
                    value: null,
                    data: test_user
                },
                __compiledWhere__: {}
            };

            var res = {end: function(){}}

            var ret = this.rest.actions.create.apply(req.context,[req,res,test_user]);
            Q.when(ret).done(function(user){
                    User.db.raw.count(function(err,count){
                        this.after_user_count = count;
                        this.before_user_count.should.equal(this.after_user_count-1);
                        (user instanceof User).should.equal(true);
                        done();
                    });
            })

        })
    });

    describe('action EDIT', function() {
        //    save one user as this.existing_user
        before(function(done){
            var User = this.User;
            var new_user = new User({nick: 'before_edit'});
            new_user.save().done(function(user){
                Mocha.existing_user = user;
                done();
            });
        });

        it('should be present', function () {
            this.rest.actions.should.have.property('edit');
        });

        it('should change record', function(done){
            var User = this.User;
            var rest = this.rest;
            var changed_user = {nick: 'after_edit'};
            var existing_user = Mocha.existing_user;
            var req = {
                context: {
                    model: User,
                    target: User,
                    controller: rest,
                    value: existing_user.id,
                    data: changed_user
                },
                __compiledWhere__: {}
            };

            var res = {end: function(){}}
            var ret = this.rest.actions.edit.apply(req.context,[req,res,existing_user.id]);
            Q.when(ret).done(function(user){
                m.log(user);
                (user.id).should.equal(Mocha.existing_user.id);
                user.should.not.eql(this.existing_user);
                user.attributes.nick.should.equal(changed_user.nick)
                done();
            });
        });
    });

    describe('action REMOVE', function(){
        before(function(done){
            var User = this.User;
            var new_user = new User({nick: 'before_edit'});
            new_user.save().done(function(user){
                Mocha.existing_user = user;
                done();
            });
        });
        it('should be present', function(){
            this.rest.actions.should.have.property('remove');
        });
        it('should destroy record',function(done){
            var User = this.User;
            var rest = this.rest;
            var existing_user = Mocha.existing_user;
            var req = {
                context:{
                    model: User,
                    target: User,
                    controller: rest,
                    value: existing_user.id
                },
                __compiledWhere__: {}
            }

            var res = {end: function(){}}

            var ret = this.rest.actions.remove.apply(req.context,[req,res,existing_user.id]);

            Q.when(ret).done(function(user){
                user.should.eql(existing_user);
//                TODO: check that the  record does not exist anymore;
                User.db.find({'_id': user.id}).done(function(collection){
                    collection.length.should.equal(0);
                    done();
                });
            });
        });
    });
})




