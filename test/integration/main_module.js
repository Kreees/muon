describe("Test for m module initialization completeness",function(){
    it("Should have properties",function(){
        m.should.have.property("models");
        m.should.have.property("utils");
        m.should.have.property("plugins");
        m.should.have.property("getModel");
        m.should.have.property("server");
    });
    it("Should have system properties",function(){
        m.should.have.property("__plugins");
    })
})