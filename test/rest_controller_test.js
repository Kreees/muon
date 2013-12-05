//Test Suite

var should = require('chai').should();
var Q = require('q');
var _ = require('underscore');
global.m = require('../lib/m_init');
var rest = require('../server/lib/controllers/rest');
var serv = require('../module').server();


describe('REST controller', function(){
    before(function(done){
        serv.onready = done;
        this.rest = m.rest;
    })

    describe('action get', function(){
        it("should be preset", function(){
            this.rest.actions.should.have.property('get');
        })
        it("should respond with valid object",function(done){
            var rest = this.rest;

            var User = m.models['user.user']

            test_user = new User;
            test_user.attributes = {nick:'prikha'}
            test_user.save().then(function(){
                m.log(test_user);

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
                    m.log(user);
                    user.should.eql(test_user);
                    done();
                });

            });

        })
    })

    describe('action index', function(){
        before(function(done){
            this.User = m.models['user.user']
            this.User.db.find().done(function(collection){
                this.test_collection = collection.slice();
                done();
            });
        })

        it("should be present",function(){
            this.rest.actions.should.have.property('index');
        })
        it("should respond with collection", function(done){
            var User = this.User;
            var UserCollection = User.__collection;

            var req = {
                context:{
                    model: User,
                    target: User,
                    context: this.rest
                },
                __compiledWhere__: {}
            }

            var res = {end: function(){}}

            var ret = this.rest.actions.index.apply(req.context,[req,res,null]);
            Q.when(ret).done(function(collection){
                var data = collection.slice();
                m.log(data);
                data.should.eql(this.test_collection);
                done();
            });

        })
    })
})




