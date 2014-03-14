var finalizeModule = m.sys.require("/router/api_lib/finalize");
var finalize = finalizeModule.finalize;
var errorize = finalizeModule.errorize;

var path = require("path");
var httpMock = m.sys.require("/testing/http_mock");
var async = require("async");
var express = require("express");

describe("Finalize module",function(){
    this.timeout(1000);
    var context = {
        old: {},
        models: []
    };

    function createUser(callback){
        var u = new m.models.user();
        context.models.push(u);
        u.save(callback);
    }

    before(function(done){
        context.old.cfg = m.cfg;
        done();
    });

    beforeEach(function(done){
        async.parallel([
            createUser,createUser,
            createUser,createUser
        ],
        done);
    });

    beforeEach(function(done){
        context.request = httpMock.createRequest({
            method: "GET",
            url: "user",
            model: m.models.user,
            actionModule: m.models.user.actionModule,
            target: m.models.user
        });
        done();
    })

    afterEach(function(done){
        context.models = [];
        m.models.user.all().remove(function(){
            done();
        });
    });

    after(function(done){
        m.reload(context.old.cfg,done);
    });

    it("Success method finalize - for one object",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(200);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.should.not.have.property("__modelName__");
                data.should.not.have.property("__fullName__");
                data.should.not.have.property("__pluginName__");
                done();
            }),context.models[0]);
    });

    it("Success method finalize - for collection",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(200);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.should.have.length(4);
                data[0].should.not.have.property("__modelName__");
                data[0].should.not.have.property("__fullName__");
                data[0].should.not.have.property("__pluginName__");
                done();
            }),context.models);
    });

    xit("Success finalize method - non model object",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(200);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.should.have.property("some","other");
                data.should.have.property("data","superdata");
                data.should.not.have.property("__modelName__");
                data.should.not.have.property("__fullName__");
                data.should.not.have.property("__pluginName__");
                done();
            }),{some: "other",data: "superdata"});
    });

    xit("Success finalize method - non model collection",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(200);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.should.have.length(2);
                data[0].should.have.property("some","other");
                data[0].should.have.property("data","superdata");
                data[0].should.not.have.property("__modelName__");
                data[0].should.not.have.property("__fullName__");
                data[0].should.not.have.property("__pluginName__");
                data[1].should.be.empty;
                done();
            }),[{some: "other",data: "superdata"},{}]);
    });

    it("Failed finalize method - null",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                done();
            }),null);
    });

    it("Failed finalize method - undefined",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                done();
            }),undefined);
    });

    it("Failed finalize method - boolean true",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                done();
            }),true);
    });


    it("Failed finalize method - boolean false",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                done();
            }),false);
    });

    it("Failed finalize method - number",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                done();
            }),0);
    });

    it("Failed finalize method - string",function(done){
        finalize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                done();
            }),"foo");
    });

    it("Success errorize method - 404 Not found",function(done){
        errorize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(404);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.statusCode.should.be.equal(404);
                data.data.should.be.equal("Not found");
                done();
            }),[404,"Not found"])
    });

    it("Success errorize method - 500 error",function(done){
        errorize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.statusCode.should.be.equal(500);
                done();
            }),[500,""])
    });
    it("Success errorize method - trimmed 500 error",function(done){
        errorize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.statusCode.should.be.equal(500);
                data.data.should.be.equal("Unknown error");
                done();
            }),[500])
    });

    it("Success errorize method - object 500 error",function(done){
        errorize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.statusCode.should.be.equal(500);
                data.data.should.be.equal("foo");
                done();
            }),{statusCode: 500, data: "foo"});
    });

    it("Success errorize method - empty object",function(done){
        errorize(context.request,
            httpMock.createResponse(function(res){
                res.statusCode.should.be.equal(500);
                expect(m.utils._.partial(JSON.parse,res._getData())).to.not.throw(Error);
                var data = JSON.parse(res._getData());
                data.statusCode.should.be.equal(500);
                data.data.should.be.equal("Unknown error");
                done();
            }),{})
    });

    it("Failed errorize method - null",function(done){
        expect(_.partial(errorize,context.request,httpMock.createResponse(function(){},null))).to.throw(/^Error should be/);
        done();
    });

    it("Failed errorize method - number",function(done){
        expect(_.partial(errorize,context.request,httpMock.createResponse(function(){},0))).to.throw(/^Error should be/);
        done();
    });

    it("Failed errorize method - string",function(done){
        expect(_.partial(errorize,context.request,httpMock.createResponse(function(){},"foo"))).to.throw(/^Error should be/);
        done();
    });

    it("Failed errorize method - true",function(done){
        expect(_.partial(errorize,context.request,httpMock.createResponse(function(){},true))).to.throw(/^Error should be/);
        done();
    });

    it("Failed errorize method - false",function(done){
        expect(_.partial(errorize,context.request,httpMock.createResponse(function(){},false))).to.throw(/^Error should be/);
        done();
    });
});