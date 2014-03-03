m.ModelView.extend({
	tagName: "tr",
	rendered: function(){
		// console.log("render item");
		var _this = this;
		this.listenTo(this.context, 'destroy', this.remove);
		this.$el.click(function(ev){
		    window.ee = ev;
		    if($(ev.target).hasClass("_remove")) return;
			m.router.navigate("/admin/data/model/"+_this.model.constructor.modelName+"/"+_this.model.id);
		});
	},
	setNumber: function(num){
		this.$("td._number").text(num);
	},
	filterAttributes: function(items){
		this.$("td.attribute").remove();
		for(var i in items){
			$('<td class = "attribute">').text(this.model.get(items[i])).appendTo(this.$el);
		}
	}
})

describe("UNIT model/data/item/item.js ItemDataModelView",function(){
    var v;
    var VClass = m.packages["MUON:admin"].views.model.item_data;
    var ModelClass = m.Model.extend({
            modelName: "thisIsTestCollectionModel",
            idAttribute: "testId",
            defaults: {
                "firstA": "first",
                "secondA": "second",
                "thirdA": "third"
            },
            url: "testModelUrl" });
        
    before(function(){
        VClass.prototype.filterAttributes.reset();
        v = new VClass(new ModelClass()); });
    
    describe("HTML .rendered()",function(){
        it("HTML td._number length -> 1",function(){
            expect(v.$("td._number").length).to.be(1)});
        it("HTML td._number text -> #",function(){
            expect(v.$("td._number").text()).to.be("#")});
        it("HTML td._remove length -> 1",function(){
            expect(v.$("td._remove").length).to.be(1)});
        it('HTML input._remove[type="checkbox"] -> 1',function(){
            expect(v.$('input._remove[type="checkbox"]').length).to.be(1)});
        it("HTML td.attribute length -> 0",function(){
            expect(v.$("td.attribute").length).to.be(0)});
    });
    
    describe("HTML .setNumber(val)",function(){
        it("HTML val = 5, td._number text -> 5",function(){
            v.setNumber(5);
            expect(Number(v.$("td._number").text())).to.be(5)});
        it("HTML val = 3, td._number text -> 3",function(){
            v.setNumber(3);
            expect(Number(v.$("td._number").text())).to.be(3)});
    });
    
    describe("HTML .filterAttributes([secondA, thirdA, firstA]) with 3 attributes",function(){
        before(function(){
            v.filterAttributes(["secondA", "thirdA", "firstA"]); });
        it("HTML td.attribute length -> 3",function(){
            expect(v.$("td.attribute").length).to.be(3)});
        it("HTML td.attribute nth-child(5) text -> firstA attribute value",function(){
            expect(v.$("td.attribute:nth-child(5)").text()).to.be("first")});
        it("HTML td.attribute nth-child(4) text -> thirdA attribute value",function(){
            expect(v.$("td.attribute:nth-child(4)").text()).to.be("third")});
        it("HTML td.attribute nth-child(3) text -> secondA attribute value",function(){
            expect(v.$("td.attribute:nth-child(3)").text()).to.be("second")});
    });
    
    describe("HTML .filterAttributes([firstA, thirdA]) with 2 attributes",function(){
        before(function(){
            v.filterAttributes(["firstA","thirdA"]); });
        it("HTML td.attribute length -> 2",function(){
            expect(v.$("td.attribute").length).to.be(2)});
        it("HTML td.attribute nth-child(3) text -> firstA attribute value",function(){
            expect(v.$("td.attribute:nth-child(3)").text()).to.be("first")});
        it("HTML td.attribute nth-child(4) text -> thirdA attribute value",function(){
            expect(v.$("td.attribute:nth-child(4)").text()).to.be("third")});
    });
    
    describe("HTML .filterAttributes([lolo, firstA]) with 2 attributes, 1 is not define in model",function(){
        before(function(){
            v.filterAttributes(["lolo","firstA"]); });
        it("HTML td.attribute length -> 2",function(){
            expect(v.$("td.attribute").length).to.be(2)});
        it("HTML td.attribute nth-child(3) text -> empty string",function(){
            expect(v.$("td.attribute:nth-child(3)").text()).to.be("")});
        it("HTML td.attribute nth-child(4) text -> firstA attribute value",function(){
            expect(v.$("td.attribute:nth-child(4)").text()).to.be("first")});
    });
    
})
