var api_router = m.__require__("/router/api_router");

var path = require("path");
var fixtPath = path.normalize(path.resolve(m.__syspath+'/test/__fixtures__'));
var httpMock = m.__require__("/testing/http_mock");
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