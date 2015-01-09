before(function(done){
    done();
});

it("dummy test",function(){
    (true).should.be.ok;
})

it("should fail",function(){
    (false).should.be.ok;
})