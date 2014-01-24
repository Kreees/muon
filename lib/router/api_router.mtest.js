var path = require("path");
var fixtPath = path.normalize(path.resolve(m.__syspath+'/test/fixtures'));
var httpMock = require(m.__syspath+"/lib/testing/http_mock");
var api_router = require("./api_router");
var express = require("express");

xdescribe("API_router",function(){
   var context = {
       old: {}
   };
   before(function(done){
       context.old.cfg = m.cfg;
       done();
   });

   beforeEach(function(done){
       m.reload({ path: fixtPath },done);
   })

   after(function(done){
       m.reload(context.old.cfg,done);
   });

   it("User throw api router api",function(done){
       var req = httpMock.createRequest({
           method: "GET",
           url: "user/1"
       });
       var res = httpMock.createResponse();
       var __end = res.end;
       res.end = function(){
           __end.apply(res,arguments);
           res.statusCode.should.be.equal(200);
           done();
       }
       api_router(req,res);
   })
});