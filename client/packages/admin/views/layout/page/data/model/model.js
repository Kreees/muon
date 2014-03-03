/** Layout предназначен для редактирования моделей одного класса, 
    с возможностью фильтрации и сортировки
    
    критерий хороших тестов мною выше указан: тест не меняется, если только не меняется тестовое окружение или поведение тестируемого объекта. 
    Основная задача тестов - не проверить отсутствие ошибок (!), а обеспечить повторяемость результатов. 
    Один раз написанный тест может впоследствии перепрогоняться мульён раз, чтобы убедиться, что изменения в реализации алгоритма(ов),
    не затрагивающие контракты и интерфейсы взаимодействия, не поломались. 
    Тесты, которые на каждый чих надо переписывать, не оправдываются ни назначением, ни затрачиваемым на них временем.
*/
m.ModelDataPageLayoutView = m.LayoutView.extend({
	events:{
		"click ul li": "selectPageEv"
	},
	rendered: function(){
		// console.log(["rerender ModelDataPageLayoutView"]);
		window.vv = this;
		var _this = this;
		this.mm = {};
        this.pageLimit = 10;
        this.totalPages = 0;
        this.currentPage = 1;
        this.totalItems = 0;
		$(this.m).bind("projection_updated.model_data_admin.model", function(ev){
			// console.log("Model projection_updated  in ModelDataPageLayoutView");
			var prj = _this.m.getProjection("model_data_admin.model");
			if(prj instanceof m.Model) _this.updateModel(prj);
		});
	},
	updateModel: function(model){
	    if(this.mm.constructor != model.constructor){
	        this.clearMe();
    	    this.mm = model;
            this.$("#model-name").text(model.constructor.prototype.modelName);
            this.currentPage = 1;  
	    }
        this.updateMe();
	},
	clearMe:function(){
	    this.totalItems = 0;
        this.totalPages = 0;
        this.currentPage = 1;
        this.$("#totalItems").text("");
        this.m.removeProjection("model_data_admin.collection");
        this.renderPaginator();
	},
	updateMe: function(){
	    var _this = this;
        this.mm.action("length",{},{
            success:function(obj){
                if(obj instanceof Array){
                    _this.__successUpdate(obj[0]);
                }else{console.log("warning: action-length return not array")};
            },
            error:function(obj){_this.__errorUpdate(obj)}});
	},
	__successUpdate:function(val){
        // if(typeof val != "number") val = 0;
        this.totalItems = val;
        var total = Math.ceil(this.totalItems/this.pageLimit);
        this.totalPages = total;
        if(this.currentPage > this.totalPages) this.currentPage = this.totalPages || 1;
        this.$("#totalItems").text(this.totalItems);
        this.renderPaginator();
        this.selectPage(this.currentPage);
    },
	__errorUpdate:function(obj){
        this.clearMe();
    },
	renderPaginator: function(){
        if(this.totalPages == 0){ this.$(".pagination ul").html("");return;}
        var $ul = this.$(".pagination ul").html("").append("<li class='previous'><a>&laquo;</a></li>");
        for(var i=1; i <= this.totalPages; i++){
            $("<li><a>"+i+"</a></li>").appendTo($ul);
        }
        $ul.append("<li class='next'><a>&raquo;</a></li>");
    },
	selectPageEv: function(ev){
		var $el = $(ev.currentTarget);
		if($el.hasClass("next")) return this.nextPage();
		if($el.hasClass("previous")) return this.previousPage();
	    this.selectPage(parseInt($el.text(),10));
	},
	selectPage: function(num){
        if(!num || _.isNaN(num) || num < 1 || num > this.totalPages) return;
        else this.currentPage = num;
        var _this = this;
        this.$(".pagination ul li").removeClass("active");
        var li_num = this.currentPage+1;
        this.$(".pagination ul li:nth-child("+li_num+")").addClass("active");
        this.setPageCollection((this.currentPage-1)*this.pageLimit, this.pageLimit);
    },
    setPageCollection: function(skip, limit, callback){
        var coll = new m.Collection([],{
                url: this.mm.urlRoot+"?__action__=paginator&__limit__="+limit+"&__skip__="+skip,
                model: this.mm.constructor
            });
        coll.fetch();
        coll.on("remove", function(){
            console.log("autoupade on remove Ev");
            if(_this.$("input._remove:checked").length != 0) return;
            _this.updateMe();
        });
       this.m.setProjection("model_data_admin.collection", coll); 
    },
    nextPage: function(){
        if(this.currentPage+1 > this.totalPages) return;
        this.selectPage(this.currentPage+1);
    },
    previousPage: function(){
        if(this.currentPage-1 < 1) return;
        this.selectPage(this.currentPage-1);
    }
	
});

describe("UNIT layout/page/data/model/model.js ModelDataPageLayoutView", function(){
    var model, newModel, spies, total, vw, collection, evSpies;
    var stub = {
        successAction:function(total){
            if(total == undefined) total = [101];
            return function(name,obj,callback){
                if(name == "length"){
                    if(typeof callback.success == "function") callback.success(total);
                }
            }
        },
        errorAction:function(val){
            return function(name,obj,callback){
                if(name == "length"){
                    if(typeof callback["error"] == "function") callback["error"](val);
                }
            }
        },
        collection:{
            fetch:function(obj){
                var prms = this.url.match(/__action__=paginator&__limit__=([0-9]+)&__skip__=([0-9]+)/);
                if(prms){
                    stub.__paginate(this, collection, Number(prms[2]), Number(prms[1]));
                }
            }
        },
        __paginate:function(context, coll, skip, limit){
            console.log(["paginate", skip, limit])
            for(var i = skip; i < (skip+limit); i++){
                if(coll.models[i]) context.add(coll.models[i]);
            }
        } 
    }
    before(function(done){
        collection = new m.Collection();
        for(var i = 1; i <= 100; i++){
            var mm = new m.Model({"property1":i});
            mm.constructor.prototype.modelName = "thisIsTestCollectionModel";
            collection.add(mm)
        };
        model = new m.Model();
        model.constructor.prototype.modelName = "thisIsModel";
        model.action = stub.successAction([100]);
        m.Collection.prototype.fetch = stub.collection.fetch;
        evSpies = {
            selectPageEv: sinon.spy(m.ModelDataPageLayoutView.prototype,"selectPageEv")
        }
        vw = new m.ModelDataPageLayoutView();
        vw.on("rendered", function(){
            done();
        });
        spies = {
            updateMe: sinon.spy(vw, "updateMe"),
            clearMe: sinon.spy(vw, "clearMe"),
            renderPaginator: sinon.spy(vw, "renderPaginator"),
            __errorUpdate: sinon.spy(vw,"__errorUpdate"),
            __successUpdate: sinon.spy(vw,"__successUpdate"),
            selectPage: sinon.spy(vw,"selectPage"),
            setPageCollection: sinon.spy(vw, "setPageCollection"),
            nextPage: sinon.spy(vw,"nextPage"),
            previousPage: sinon.spy(vw,"previousPage")
        };
    });
    after(function(){
        $("li.test.pass.fast").css({"display":"none"});
    });
    describe("UNIT .rendered()",function(){
        describe("init parameters validation",function(){
            it(".currentPage -> is 1",function(){
                expect(vw.currentPage).to.be(1); });
            it(".pageLimit -> is more than 0",function(){
                expect(vw.pageLimit).to.be.greaterThan(0); }); 
            it(".totalPages -> is 0",function(){
                expect(vw.totalPages).to.be(0); });
            it(".totalItems -> is 0",function(){
                expect(vw.totalItems).to.be(0); });
            it(".mm -> is {}",function(){
                expect(vw.mm).to.eql({}); });
            it("Projection model_data_admin.model -> is undefined",function(){
                expect(vw.m.getProjection("model_data_admin.model")).to.be.an('undefined'); });
            it("Projection model_data_admin.collection -> is undefined",function(){
                expect(vw.m.getProjection("model_data_admin.collection")).to.be.an('undefined'); });
        });
        describe("HTML $el",function(){
            it("(#totalItems) text -> empty",function(){
                expect(vw.$("#totalItems").html()).to.be(""); });
            it.skip("TODO all jade-after-rendered test",function(){ });
        });
    });
    
    describe("UNIT .updateModel(model)",function(){
        describe(".mm == model",function(){
            var model2;
            before(function(){
                vw.mm = model;
                model2 = new m.Model(); });
            it("model2.constructor == model.constructor",function(){
                expect(model.constructor).to.be(model2.constructor); });
            it("call .updateMe() once",function(){
                spies.updateMe.reset();
                vw.updateModel(model2);
                expect(spies.updateMe.calledOnce).to.be(true); });
        });
        
        describe(".mm != model",function(){
            before(function(){
                vw.mm = model;
                vw.currentPage = 4;
                vw.$("#model-name").text("lolo");
                var NewModel = m.Model.extend({lolo:function(){}});
                newModel = new NewModel();
                model.constructor.prototype.modelName = "thisIsNewModel";
                newModel.action = stub.successAction();
                spies.clearMe.reset();
                spies.updateMe.reset();
                vw.updateModel(newModel);
            });
            it("IN newModel !-> model",function(){
                expect(model.constructor).not.to.be(newModel.constructor); });
            it(".clearMe() -> called once",function(){
                expect(spies.clearMe.calledOnce).to.be(true); });
            it(".mm -> newModel",function(){
                expect(vw.mm).to.be(newModel); });
            it(".currentPage -> 1",function(){
                expect(vw.currentPage).to.be(1);  });
            it("HTML $el (#model-name) -> newModel modelname",function(){
                expect(vw.$("#model-name").text()).to.be(newModel.constructor.prototype.modelName); });
            it(".updateMe() -> called once",function(){
                expect(spies.updateMe.calledOnce).to.be(true); });
            
        });
    });
    describe("UNIT .clearMe()",function(){
        before(function(){
            vw.m.setProjection("model_data_admin.collection", new m.Collection());
            vw.totalItems = 40;
            vw.totalPages = 4;
            vw.currentPage = 3;
            vw.$("#totalItems").text("lolo");
            spies.renderPaginator.reset();
            vw.clearMe();
        });
        it(".totalPages -> 0",function(){
            expect(vw.totalPages).to.be(0); });
        it(".totalItems -> 0",function(){
            expect(vw.totalItems).to.be(0); });
        it(".currentPage -> 1",function(){
            expect(vw.currentPage).to.be(1); });
        it("Projection model_data_admin.collection -> is undefined",function(){
            expect(vw.m.getProjection("model_data_admin.collection")).to.be.an('undefined'); });
        it(".renderPaginator -> called once",function(){
           expect(spies.renderPaginator.calledOnce).to.be(true);  });
        describe("HTML .$el",function(){
            it("(#totalItems) text -> empty ",function(){
                expect(vw.$("#totalItems").text()).to.be(""); });
        });
    });
    
    describe("UNIT .updateMe()",function(){
        before(function(){
            spies.action = sinon.spy(model,"action");
            vw.mm = model;
            vw.updateMe();
        });
        it(".mm.action() -> called once",function(){
            expect(spies.action.calledOnce).to.be(true); });
        it(".mm.action() -> action - length",function(){
            expect(spies.action.calledWith("length")).to.be(true); });
        describe("call success .mm.action()",function(){
            var obj;
            before(function(){
                obj = [50,10,20];
                spies.__successUpdate.reset();
                vw.mm.action = stub.successAction(obj);
                vw.updateMe();
            });
            it(".__successUpdate(val) -> called once with val",function(){
                expect(spies.__successUpdate.calledOnce).to.be(true); });
            it("IFACE .__successUpdate(val) val -> is first from array",function(){
                expect(spies.__successUpdate.calledWith(obj[0])).to.be(true); });
        });
        describe("call error .mm.action() ",function(){
            var obj;
            before(function(){
                obj = "this is test";
                spies.__errorUpdate.reset();
                vw.mm.action = stub.errorAction(obj);
                vw.updateMe();
            });
            it(".__errorUpdate()",function(){
                expect(spies.__errorUpdate.calledOnce).to.be(true); });
            it("IFACE .__errorUpdate(val) val -> is ok",function(){
                expect(spies.__errorUpdate.calledWith(obj)).to.be(true); });
        });
    });
       
    describe("UNIT .__errorUpdate()",function(){
        before(function(){
            spies.clearMe.reset();
            vw.__errorUpdate();
        });
        it(".clearMe() -> called once",function(){
            expect(spies.clearMe.calledOnce).to.be(true); });
    });
    
    describe("UNIT .__successUpdate(val)",function(){
        var val;
        var iface = function(){
            describe("interface",function(){
                it("val -> typeof number, >= 0",function(){
                    expect(val).to.be.a('number');
                    expect(val).not.to.be.lessThan(0); });
                it(".pageLimit -> typeof number, > 0",function(){
                    expect(vw.pageLimit).to.be.a('number');
                    expect(vw.pageLimit).to.be.greaterThan(0); });
                it(".currentPage -> typeof number, > 0",function(){
                    expect(vw.pageLimit).to.be.a('number');
                    expect(vw.pageLimit).to.be.greaterThan(0); });
            });
        };
        before(function(){
            vw.totalItems = 1000;
            vw.pageLimit = 5;
            vw.__successUpdate(49);
        });
        it("IFACE .pageLimit -> is more than 0",function(){
            expect(vw.pageLimit).to.be.greaterThan(0); }); 
        it(".totalItems == val",function(){
            expect(vw.totalItems).to.be(49); });
        
        describe(".totalPages",function(){
            it("целая часть округленная в большую сторону val / limit",function(){
                vw.__successUpdate(49);
                expect(vw.totalPages).to.be(10);
            });
            it("==0, if val = 0",function(){
                vw.__successUpdate(0);
                expect(vw.totalPages).to.be(0);
            });
        });
        describe(".currentPage",function(){
            it("currentPage > totalPages,  currentPage -> totalPages",function(){
                vw.currentPage = 14;
                vw.__successUpdate(50);
                expect(vw.currentPage).to.be(vw.totalPages);
            });
            it("currentPage < totalPages, currentPage -> not change",function(){
                vw.currentPage = 3;
                vw.__successUpdate(50);
                expect(vw.currentPage).to.be(3);
            });
            it("totalPages = 0, currentPage -> 1",function(){
                vw.currentPage = 3;
                vw.__successUpdate(0);
                expect(vw.currentPage).to.be(1);
            });
        });
        describe("HTML .$el",function(){
            it("(#totalItems) text -> .totalItems",function(){
                expect(vw.$("#totalItems").html()).to.be(vw.totalItems.toString());
            });
        });
        describe("",function(){
            before(function(){
                spies.selectPage.reset();
                spies.renderPaginator.reset();
                vw.__successUpdate(100);
            });
            it(".renderPaginator() -> called once", function(){
                expect(spies.renderPaginator.calledOnce).to.be(true); });
            it(".selectPage(val) -> called once", function(){
                expect(spies.selectPage.calledOnce).to.be(true); });
            it(".selectPage(val) val -> .currentPage", function(){
                expect(spies.selectPage.calledWith(vw.currentPage)).to.be(true); });
        })
    });
   
    describe("UNIT .renderPaginator()",function(){
        describe("HTML .$el",function(){
            describe("totalPages != 0 ",function(){
                before(function(){
                    vw.totalPages = 5;
                    vw.renderPaginator();
                })
                it("(.pagination ul) -> one",function(){
                    expect(vw.$(".pagination ul").length).to.be(1); });
                it("(.pagination ul li.previous) -> one",function(){
                    expect(vw.$(".pagination ul li.previous").length).to.be(1); });
                it("(.pagination ul li.next) -> one",function(){
                    expect(vw.$(".pagination ul li.next").length).to.be(1); });
                it("(.pagination ul li) -> count of pages +2",function(){
                    expect(vw.$(".pagination ul li").length).to.be(5+2); });
                it("(.pagination ul li.active) -> zero",function(){
                    expect(vw.$(".pagination ul li.active").length).to.be(0); });
            });
            describe("totalPages == 0 ",function(){
                before(function(){
                    vw.totalPages = 0;
                    vw.renderPaginator(); });
                it("(.pagination ul) html -> empty ",function(){
                    expect(vw.$(".pagination ul").html()).to.be(""); });
            });
        });
    });
    
    describe("UNIT EVENT .selectPageEv(ev)",function(){
        before(function(){
            vw.totalPages = 5;
            vw.renderPaginator();
        });
        it("paginator(5 pages) li clicked: .selectPageEv -> called (7)",function(done){
            evSpies.selectPageEv.reset();
            setTimeout(function(){
                expect(evSpies.selectPageEv.callCount).to.be(7);
                done();},100);
            vw.$(".pagination ul li").trigger("click");
        });
        it("next button clicked: .nextPage -> called once",function(done){
            spies.nextPage.reset();
            setTimeout(function(){
                expect(spies.nextPage.calledOnce).to.be(true);
                done();},100);
            vw.$(".pagination ul li.next").trigger("click");
        });
        it("previous button clicked: .previousPage -> called once",function(done){
            spies.previousPage.reset();
            setTimeout(function(){
                expect(spies.previousPage.calledOnce).to.be(true);
                done();},100);
            vw.$(".pagination ul li.previous").trigger("click");
        });
        describe("page(3) clicked",function(){
            before(function(done){
                spies.selectPage.reset();
                setTimeout(function(){done();},100);
                vw.$(".pagination ul li:nth-child(4)").trigger("click");
            });
            it(".selectPage -> called",function(){
                expect(spies.selectPage.called).to.be(true); });
            it(".selectPage -> called with 3",function(){
                expect(spies.selectPage.calledWith(3)).to.be(true); });
        });
    });
    
    describe("UNIT .selectPage(num)",function(){
        before(function(){
            vw.totalPages = 10;
            vw.renderPaginator();
        });
        describe("num is correct Number",function(){
            before(function(){
               vw.currentPage = 3;
               vw.pageLimit = 10;
               spies.setPageCollection.reset();
               vw.selectPage(5) 
            });
            it(".currentPage -> selected num",function(){
                expect(vw.currentPage).to.be(5); });
            it("HTML (.pagination ... li.active) -> is one",function(){
                expect(vw.$(".pagination ul li.active").length).to.be(1); });
            it("HTML (.pagination ... li.active) -> is current page",function(){
                expect(vw.$(".pagination ul li:nth-child("+6+")").hasClass("active")).to.be(true); });
            it(".setPageCollection() -> called once",function(){
                expect(spies.setPageCollection.calledOnce).to.be(true);  });
            it(".setPageCollection() -> called with right skip, limit",function(){
                expect(spies.setPageCollection.calledWith(40, 10)).to.be(true);  });
            it(".setPageCollection() ->(+) called with right skip, limit",function(){
                vw.pageLimit = 3;
                vw.selectPage(6);
                expect(spies.setPageCollection.calledWith(15, 3)).to.be(true); });
        });
        describe("num is wrong -> no changes, no calls",function(){
            var prj;
            before(function(){
                prj = new m.Collection([],{
                    url: "testUrl"
                });
                vw.m.setProjection("model_data_admin.collection", prj); });
            
            beforeEach(function(){
               vw.currentPage = 3; });
               
            it("num = undefined",function(){
                vw.selectPage(); 
                expect(vw.currentPage).to.be(3); });
            it("num > totalPages",function(){
                vw.selectPage(11); 
                expect(vw.currentPage).to.be(3); });
            it("num < 1",function(){
                vw.selectPage(0); 
                expect(vw.currentPage).to.be(3);
                vw.selectPage(-2); 
                expect(vw.currentPage).to.be(3); });
            it("Projection model_data_admin.collection -> not changed",function(){
                expect(vw.m.getProjection("model_data_admin.collection")).to.be(prj); });
        });
    });
    
    describe("UNIT .setPageCollection()",function(){
        it("total=100, limit = 5, skip = 10 Collection length -> 5, first model -> 11",function(){
            vw.totalPages = 100;
            vw.setPageCollection(10, 5);
            var coll = vw.m.getProjection("model_data_admin.collection");
            expect(coll.length).to.be(5);
            expect(coll.models[0].get("property1")).to.be(11); });
        it("total=100, limit = 5, skip = 97 Collection length -> 3, first model -> 98",function(){
            vw.totalPages = 100;
            vw.setPageCollection(97, 5);
            var coll = vw.m.getProjection("model_data_admin.collection");
            expect(coll.length).to.be(3);
            expect(coll.models[0].get("property1")).to.be(98); });
    });
    
    describe("UNIT .nextPage()",function(){
        describe("nextPage > .totalPages",function(){
            before(function(){
               vw.currentPage = 5;
               vw.totalPages = 5; 
               vw.nextPage(); });
            it(".currentPage -> not changed",function(){
                expect(vw.currentPage).to.be(5); });
        });
        describe("nextPage <= .totalPages",function(){
            before(function(){
               vw.currentPage = 1;
               vw.totalPages = 4; 
               spies.selectPage.reset();
               vw.nextPage(); });
            it(".selectPage() -> called with next page",function(){
                expect(spies.selectPage.calledWith(2)).to.be(true); });
        });
    });
    
    describe("UNIT .previousPage()",function(){
         describe("previousPage >= 1",function(){
            before(function(){
               vw.currentPage = 5;
               spies.selectPage.reset();
               vw.previousPage(); });
            it(".selectPage() -> called with previous page",function(){
                expect(spies.selectPage.calledWith(4)).to.be(true); });
        });
        describe("previousPage < 1",function(){
            before(function(){
               vw.currentPage = 1;
               vw.previousPage(); });
            it(".currentPage -> 1",function(){
                expect(vw.currentPage).to.be(1); });
        });
    });
});
describe("IFACE ModelDataPageLayoutView layout/page/data/model/model.js",function(){
    
    var ModelClass, model1, view;
    var spies = {};
    var stub = {
        successAction:function(total){
            if(total == undefined) total = [99];
            return function(name,obj,callback){
                if(name == "length"){
                    if(typeof callback.success == "function") callback.success(total);
                }
            }
        },
        errorAction:function(){
            return function(name,obj,callback){
                if(name == "length"){
                    if(typeof callback["error"] == "function") callback["error"]();
                }
            }
        },
        fetch:function(){}
    }
    before(function(){
            m.Collection.prototype.fetch = stub.fetch;
            ModelClass = m.Model.extend({
                modelName: "thisIsTestCollectionModel",
                url: "testModelUrl" });
            ModelClass2 = m.Model.extend({
                modelName: "thisIsTestCollectionModel2",
                url: "testModelUrl2" });
        });
    describe("ModelDataPageLayoutView rendered, page limit = 12, server models count = 100",function(){
        var skip, limit;
        before(function(done){
            model1 = new ModelClass();
            model1.action = stub.successAction([100]);
            model2 = new ModelClass2();
            model2.action = stub.successAction([50]);
            m.ModelDataPageLayoutView.prototype.m.setProjection("model_data_admin.collection", undefined);
            view = new m.ModelDataPageLayoutView();
            view.pageLimit = 12;
            spies.updateCollPrj = sinon.spy();
            $(view.m).bind("projection_updated.model_data_admin.collection", spies.updateCollPrj);
            view.on("rendered", function(){
                done();
            });
        });
        it('Projection("model_data_admin.collection") = undefined',function(){
            expect(view.m.getProjection("model_data_admin.collection")).to.be(undefined); });
        
        describe("set undefined projection('model_data_admin.model') to model1 ",function(){
            before(function(done){
                $(view.m).one("projection_updated.model_data_admin.collection", function(){
                    done();
                });
                view.m.setProjection("model_data_admin.model", model1);
            });
            it('IFACE projection "model_data_admin.collection" updated',function(){
                expect(spies.updateCollPrj.called).to.be(true); });
            it('IFACE "__skip__" in "model_data_admin.collection" projection = 0 ',function(){
                expect(Number(view.m.getProjection("model_data_admin.collection").url.match(/__skip__=([0-9]+)/)[1])).to.be(0);            });
            it('IFACE "__limit__" in "model_data_admin.collection" projection = 12 ',function(){
                expect(Number(view.m.getProjection("model_data_admin.collection").url.match(/__limit__=([0-9]+)/)[1])).to.be(12);            });
            it("HTML .$el (#model-name) -> model1 modelname",function(){
                expect(view.$("#model-name").text()).to.be(model1.modelName); });
            it("HTML .$el (#totalItems) text -> 100",function(){
                expect(view.$("#totalItems").html()).to.be("100"); });
            it("HTML .$el (ul li.active) length -> 1",function(){
                expect(view.$("ul li.active").length).to.be(1); });
            it("HTML .$el (ul li) length -> 11(+prev/next)",function(){
                expect(view.$("ul li").length).to.be(9+2); });
        });
        describe("set model1 projection('model_data_admin.model') to model2 ",function(){
            before(function(done){
                spies.updateCollPrj.reset();
                $(view.m).one("projection_updated.model_data_admin.collection", function(){
                    done();
                });
                view.m.setProjection("model_data_admin.model", model2);
            });
            it('IFACE projection "model_data_admin.collection" updated',function(){
                expect(spies.updateCollPrj.called).to.be(true); });
            it('IFACE "__skip__" in "model_data_admin.collection" projection = 0 ',function(){
                expect(Number(view.m.getProjection("model_data_admin.collection").url.match(/__skip__=([0-9]+)/)[1])).to.be(0);            });
            it('IFACE "__limit__" in "model_data_admin.collection" projection = 12 ',function(){
                expect(Number(view.m.getProjection("model_data_admin.collection").url.match(/__limit__=([0-9]+)/)[1])).to.be(12);            });
            it("HTML .$el (#model-name) -> model2 modelname",function(){
                expect(view.$("#model-name").text()).to.be(model2.modelName); });
            it("HTML .$el (#totalItems) text -> 100",function(){
                expect(view.$("#totalItems").html()).to.be("50"); });
            it("HTML .$el (ul li.active) length -> 1",function(){
                expect(view.$("ul li.active").length).to.be(1); });
            it("HTML .$el (ul li) length -> 7(+prev/next)",function(){
                expect(view.$("ul li").length).to.be(5+2); });
        });
        
        
    });
    
});
