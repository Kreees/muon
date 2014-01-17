m.ModelDataPageLayoutView = m.LayoutView.extend({
	events:{
		"click ul li": "selectPageEv",
		"click th.attribute": "sort"
	},
	rendered: function(){
		// console.log("rerender ModelDataPageLayoutView")
		window.vv = this;
		var _this = this;
		this.mm = {};
		$(this.m).bind("projection_updated.model_data_admin.model", function(ev){
			// console.log("Model projection_updated  in ModelDataPageLayoutView");
			var prj = _this.m.getProjection("model_data_admin.model");
			if(prj instanceof m.Model){
				if(_this.mm.constructor == prj.constructor){return;}
				else{_this.mm = prj;}
				_this.$("#model-name").text(prj.constructor.prototype.modelName);
				_this.__initPager();
			}
		});
	},
	__initPager: function(){
		var _this = this;
		this.pageLimit = 10;
		this.totalPages = 0;
		this.currentPage = 1;
		this.totalItems = 0;
		_this.$("#totalItems").text("loading...");
        this.m.removeProjection("model_data_admin.collection");
        this.renderPaginator();
		this.mm.action("length",{},{
            success:function(a){
                if(a instanceof Array){
                    _this.totalItems = a[0];
                    _this.totalPages = Math.ceil(_this.totalItems/_this.pageLimit);
                    _this.currentPage = 1;
                }
                _this.$("#totalItems").text(_this.totalItems);
                _this.renderPaginator();
                _this.selectPage(_this.currentPage);
            },error:function(){
                 _this.$("#totalItems").text("");
            }});
	},
	updatePager: function(){
	    // console.log("!!update");
	    var _this = this;
        this.mm.action("length",{},{
            success:function(a){
                if(a instanceof Array){
                    _this.totalItems = a[0];
                    var total = Math.ceil(_this.totalItems/_this.pageLimit);
                    if(_this.totalPages != total) _this.renderPaginator();
                    _this.totalPages = total; 
                    if(_this.currentPage > _this.totalPages) _this.currentPage = _this.totalPages;
                }else{ 
                    _this.totalItems = 0;
                    _this.totalPages = 0;
                    _this.currentPage = 1;
                    _this.renderPaginator();
                }
                _this.$("#totalItems").text(_this.totalItems);
                _this.selectPage(_this.currentPage);
               
            },error:function(){
                _this.totalItems = 0;
                _this.totalPages = 0;
                _this.currentPage = 1;
                _this.$("#totalItems").text("...error...");
            }});
	},
	renderPaginator: function(){
        if(this.totalPages == 0){ this.$(".pagination ul").html("");
            return;
        }
        var $ul = this.$(".pagination ul").html("").append("<li class='previous'><a>&laquo;</a></li>");
        for(var i=1; i <= this.totalPages; i++){
            $("<li><a>"+i+"</a></li>").appendTo($ul);
        }
        $ul.append("<li class='next'><a>&raquo;</a></li>");
    },
	selectPageEv: function(ev){
		var $el = $(ev.currentTarget);
		if($el.hasClass("next")) return this.selectPage("next");
		if($el.hasClass("previous")) return this.selectPage("prev");
	    this.selectPage(parseInt($el.text(),10));
	},
	selectPage: function(num){
        if(num == "next"){
            if(this.currentPage+1 > this.totalPages) return;
            this.currentPage = this.currentPage+1;
        }else{
            if(num == "prev"){
                if(this.currentPage-1 < 1) return;
                this.currentPage = this.currentPage-1;
            }else{
                if(_.isNaN(num) && num < 1 && num > this.totalPages) return;
                else this.currentPage = num; 
            } 
        }
        this.$(".pagination ul li").removeClass("active");
        var num = this.currentPage+1;
        this.$(".pagination ul li:nth-child("+num+")").addClass("active");
        this.setPage();
    },
    nextPage: function(){
        
    },
    previousPage: function(){
        
    },
    setPage: function(){
        // console.log(["Paginate: ", num]);
        var _this = this;
        var num = this.currentPage;
        num = num-1;
        var start = num*this.pageLimit;
        if(this.currentColl){
            this.currentColl.reset();
            this.currentColl.stopListening();
        }
        var coll = new m.Collection([],{
                url: this.mm.urlRoot+"?__action__=paginator&__limit__="+this.pageLimit+"&__skip__="+start,
                model: this.mm.constructor,
                startNum: start
            });
        this.currentColl = coll;
        coll.fetch();
        coll.on("remove", function(){
            // console.log("autoupade on remove Ev"+ num);
            if(_this.$("input._remove:checked").length != 0) return;
            _this.updatePager();
        });
       this.m.setProjection("model_data_admin.collection", this.currentColl);
    },
     sort: function(ev){
         var att = $(ev.currentTarget).text();
         if(this.mm.get(att) || att == this.mm.idAttribute){
            this.currentColl.comparator = att;
            this.currentColl.sort();
         } 
     }
	
});

// describe("model test group", function() {
    // describe("inner test group", function() {
        // console.log(this);
        // var a;
            // a = true;
            // expect(a).toBe(true);
    // });  
// });