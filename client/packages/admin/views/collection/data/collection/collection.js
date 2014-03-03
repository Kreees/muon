/** CollectionView предназначен для отображения понумерованного списка моделей, 
    с возможностью фильтрации, сортировки, удаления
*/
m.CollectionView.extend({
	target:"list",
	modelView:"item_data",
    events:{
        "click button.items-remove ": "removeSelected",
        "click th.attribute": "sort"
    },
	rendered:function(){
	    window.cv = this;
		// console.log(["rerender Collection "]);
		this.defaultFilter = [this.collection.model.prototype.idAttribute];
		this.setAttributesFilter(this.defaultFilter);
		this.listenTo(this.collection, "sync", this.synced);
		this.listenTo(this.collection, "sort", this.renumber);
		this.synced();
	},
	synced: function(){
	    var mch = this.collection.url && this.collection.url.match(/__skip__=([0-9]+)/);
        if(!mch) mch = [];
        this.startNumber = Number(mch[1])+1 || 1;
	    for(var i in this.collection.models){
            this.filterModelAttributes(this.collection.models[i]); }
        this.renumber();
	},
	renumber:function(){
	    var start = this.startNumber;
        for(var i in this.collection.models){
            this.childModels[this.collection.models[i].id].setNumber(start++); }
	},
	filterModelAttributes: function(model){
	    if(!this.childModels || !model.id) return;
		if(this.childModels[model.id]){
		    if(typeof this.childModels[model.id].filterAttributes != "function") return;
 		    this.childModels[model.id].filterAttributes(this.filter);
 		}
	},
	removeSelected:function(){
	    var _this = this;
	    if(this.$("input._remove:checked").length == 0) return;
	    if(confirm("A you shure to remove selected items from database?")){
	        this.$("input._remove:checked").each(function(){
	            var _id = $(this).closest("tr").attr("id");
	            var _m = _this.collection.get(_id);
	            if(_m) _m.destroy({wait: true});
	        });
	    }
	},
	setAttributesFilter: function(filter){
	    if(typeof filter == "number"){
	        var items = [];
            items.push(this.collection.model.prototype.idAttribute);
            for(var i in this.collection.model.prototype.defaults){
                if(filter == 0) break;
                items.push(i);
                filter--;
            }
            this.filter = items;
	    }else{
	        this.filter = filter;}
		this.$("thead tr th.attribute").remove();
        if(this.filter){
            for(var i in this.filter){
                $("<th class='attribute'>").attr("data-value",this.filter[i]).text(this.filter[i]).appendTo(this.$("thead tr"));}
        }
        for(var i in this.collection.models){
            this.filterModelAttributes(this.collection.models[i]);}
	},
	sort: function(ev){
        this.collection.comparator = $(ev.currentTarget).text();
        this.collection.sort();
    }
});

describe("UNIT collection/data/collection/collection.js CollectionView", function(){
    var v, modelsArray;
    var CollView = m.packages["MUON:admin"].views.collection.collection_data;
    var ModelView = m.packages["MUON:admin"].views.model.item_data;
    var ModelClass = m.Model.extend({
            modelName: "thisIsTestCollectionModel",
            idAttribute: "testId",
            defaults: {
                "firstA": "first",
                "secondA": "second",
                "thirdA": "third"
            },
            url: "testModelUrl" });
    var CollClass = m.Collection.extend({model: ModelClass, url: "testModelUrl?__action__=paginator&__limit__=10&__skip__=5"});
    var evSpies = {
            renumber: sinon.spy(CollView.prototype,"renumber"),
            filterModelAttributes: sinon.spy(CollView.prototype,"filterModelAttributes"),
            sort: sinon.spy(CollView.prototype,"sort"),
            removeSelected: sinon.spy(CollView.prototype,"removeSelected"),
            setAttributesFilter: sinon.spy(CollView.prototype,"setAttributesFilter"),
            synced: sinon.spy(CollView.prototype,"synced"),
            filterAttributes: sinon.spy(ModelView.prototype, "filterAttributes"),
            setNumber: sinon.spy(ModelView.prototype, "setNumber")
        }
        
    before(function(done){
        modelsArray = []; 
        for(var i = 1; i <= 5; i++){
            var mm = new ModelClass();
            mm.id = 1000+i;
            modelsArray.push(mm);
        };
        v = new CollView(new CollClass(modelsArray));
        v.on("rendered", function(){done();});
    });
    after(function(){
        $("li.test.pass.fast").css({"display":"none"});
        for(var i in evSpies){
            evSpies[i].restore();
        }
    });
    describe(".rendered()",function(){
        it(".collection -> defined",function(){
            expect(v.collection).to.be.an(m.Collection);});
        it(".startNumber -> number",function(){
            expect(v.startNumber).to.be.a("number"); });
        it("collection.url with skip == 5, .startNumber -> 6",function(){
            expect(v.startNumber).to.be(6); });
        it(".defaultFilter -> just id attribute \"testId\" ",function(){
            expect(v.defaultFilter).to.be.eql(["testId"]); });
        it(".setAttributesFilter -> called with .defaultFilter",function(){
            expect(evSpies.setAttributesFilter.calledOnce).to.be.ok();
            expect(evSpies.setAttributesFilter.calledWith(v.defaultFilter)).to.be(true);
        });
        it(".synced -> called once",function(){
            expect(evSpies.synced.calledOnce).to.be.ok(); });
        describe("HTML ",function(){
            it("table -> rendered",function(){
               expect(v.$("table.collection-data").length).to.be(1);});
            it("remove items cell in table head -> rendered",function(){
               expect(v.$("th.items-remove").length).to.be(1); });
            it("sequence number cell in table head ",function(){
               expect(v.$("th.items-number").length).to.be(1); });
            it("id cell in table head -> model idAttribute",function(){
               expect(v.$('th.attribute[data-value='+ModelClass.prototype.idAttribute+']').length).to.be(1); });
        });
    });
    describe(".filterModelAttributes()",function(){
        before(function(){
            var model = v.collection.models[0];
            evSpies.filterAttributes.reset();
            v.filterModelAttributes(model);
        });
        it("model view .filterAttributes -> called ",function(){
            expect(evSpies.filterAttributes.called).to.be(true);});
    });
    describe(".renumber(), startNumber = 4, 5 models",function(){
        before(function(){
            v.startNumber = 4;
            evSpies.setNumber.reset();
            v.renumber();
        });
        it("model view .setNumber -> calles 5 times ",function(){
            expect(evSpies.setNumber.callCount).to.be(5);});
            
        it("model view .setNumber -> calles with 4,5,6,7,8",function(){
            expect(evSpies.setNumber.calledWith(4)).to.be(true);
            expect(evSpies.setNumber.calledWith(5)).to.be(true);
            expect(evSpies.setNumber.calledWith(6)).to.be(true);
            expect(evSpies.setNumber.calledWith(7)).to.be(true);
            expect(evSpies.setNumber.calledWith(8)).to.be(true);
        });
    });
    describe(".synced()",function(){
        before(function(){
            evSpies.renumber.reset();
            evSpies.filterModelAttributes.reset();
            v.synced();
        });
        it(".renumber -> called once",function(){
            expect(evSpies.renumber.calledOnce).to.be(true);
        });
        it(".filterModelAttributes -> calles for each model",function(){
            for(var i in v.collection.models){
                expect(evSpies.filterModelAttributes.calledWith(v.collection.models[i])).to.be(true); 
            }
        });
    });
    describe.skip(".removeSelected()",function(){
        before(function(){});
        it("TODO",function(){});
    });
    describe(".setAttributesFilter(val)",function(){
        describe("val is array ",function(){
            before(function(){
                evSpies.filterModelAttributes.reset();
                v.setAttributesFilter(["secondA", "firstA"]);
            });
            it(".filter -> is val",function(){
                expect(v.filter).to.be.eql(["secondA", "firstA"]);
            });
            it("HTML $(th.attribute) length -> 2 ",function(){
                expect(v.$("th.attribute").length).to.be(2);
            });
            it(".filter[0] -> idAttribute",function(){
                expect(v.filter[0]).to.be("secondA");
            });
            it(".filter[1] -> first default attribute",function(){
                expect(v.filter[1]).to.be("firstA");
            });
            it("HTML $(th.attribute) data-value = secondA -> ",function(){
                expect(v.$('th.attribute[data-value="secondA"]').length).to.be(1);
                expect(v.$('th.attribute:nth-child(3)').attr("data-value")).to.be("secondA");
            });
            it("HTML $(th.attribute) data-value = firstA ->  ",function(){
                expect(v.$('th.attribute[data-value="firstA"]').length).to.be(1);
                expect(v.$('th.attribute:nth-child(4)').attr("data-value")).to.be("firstA");
            });
            it(".filterModelAttribues -> calles for each model",function(){
                for(var i in v.collection.models){
                    expect(v.filterModelAttributes.calledWith(v.collection.models[i])).to.be(true); 
                }
            });
        });
        describe("val is number ",function(){
            before(function(){
                v.setAttributesFilter(2);
            });
            it(".filter -> array ",function(){
                expect(v.filter).to.be.an("array"); });
            it(".filter[0] -> idAttribute",function(){
                expect(v.filter[0]).to.be("testId"); });
            it(".filter[1] -> first default attribute",function(){
                expect(v.filter[1]).to.be("firstA"); });
            it(".filter[2] -> second default attribute",function(){
                expect(v.filter[2]).to.be("secondA"); });
            it(".filterModelAttribues -> calles for each model",function(){
                for(var i in v.collection.models){
                    expect(v.filterModelAttributes.calledWith(v.collection.models[i])).to.be(true); 
                }
            });
            it("HTML $(th.attribute) length -> 3 ",function(){
                expect(v.$("th.attribute").length).to.be(3); });
            it("HTML $(th.attribute) data-value = secondA -> is column 3",function(){
                expect(v.$('th.attribute[data-value="testId"]').length).to.be(1);
                expect(v.$('th.attribute:nth-child(3)').attr("data-value")).to.be("testId");
            });
            it("HTML $(th.attribute) data-value = secondA -> is column 5",function(){
                expect(v.$('th.attribute[data-value="secondA"]').length).to.be(1);
                expect(v.$('th.attribute:nth-child(5)').attr("data-value")).to.be("secondA");
            });
            it("HTML $(th.attribute) data-value = firstA ->  is column 4",function(){
                expect(v.$('th.attribute[data-value="firstA"]').length).to.be(1);
                expect(v.$('th.attribute:nth-child(4)').attr("data-value")).to.be("firstA");
            });
        });
    });
    describe.skip(".sort()",function(){
        before(function(){});
        it("",function(){});
    });
    describe("IFACE collection.url v.rendered()",function(){
        var _v;
        describe("collection.url not right",function(){
            before(function(done){
                _v = new CollView(new CollClass(modelsArray,{url:"sfsfdsfsdfdsfdssfdsdff"}));
                _v.on("rendered", function(){done();});
            });
            it(".startNumber -> 1",function(){
                expect(_v.startNumber).to.be(1); });
        });
         
    });
});


