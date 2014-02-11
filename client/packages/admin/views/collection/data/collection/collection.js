/** CollectionView предназначен для отображения понумерованного списка моделей, 
    с возможностью фильтрации, сортировки, удаления
*/
m.CollectionView.extend({
	target:"list",
	modelView:"item_data",
    events:{
        "click button._remove ": "removeSelected",
        "click th.attribute": "sort"
    },
	rendered:function(){
	    window.cv = this;
		// console.log(["rerender Collection "]);
		this.setAttrFilter(4);
		this.listenTo(this.context, "sync", this.numbering);
		this.listenTo(this.context, "sort", this.numbering);
		this.listenTo(this.context, "add", this.__addItem);
		this.numbering();
	},
	numbering:function(){
	    var start = this.context.startNum;
        for(var i in this.collection.models){
            this.childModels[this.collection.models[i].id].setNumber(++start);
        }
	},
	__addItem: function(model){
		if(this.childModels[model.id]) this.childModels[model.id].filterAttributes(this.filter);
	},
	removeSelected:function(){
	    var _this = this;
	    if(this.$("input._remove:checked").length == 0) return;
	    if(confirm("A you shure to remove selected items from database?")){
	        this.$("input._remove:checked").each(function(){
	            var _id = $(this).closest("tr").attr("id");
	            var _m = _this.collection.get(_id);
	            if(_m){
	                _m.destroy({wait: true});
	            }
	        });
	    }
	},
	setAttrFilter: function(num){
		var items = [];
		var _empt = new this.collection.model();
		items.push(_empt.idAttribute);
		var iter = num;
		for(var i in _empt.attributes){
			if(iter == 0) break;
			items.push(i);
			iter--;
		}
		this.filter = items;
		this.$("thead tr th:gt(1)").html("")
        if(items){
            for(var i in items){
                $("<th class='attribute'>").text(items[i]).appendTo(this.$("thead tr"));
            }
        }
	},
	sort: function(ev){ //TODO move to collection
        var att = $(ev.currentTarget).text();
        // if(this.mm.get(att) || att == this.mm.idAttribute){
           this.collection.comparator = att;
           this.collection.sort();
        // } 
    }
	
});

describe("collection/data/collection/collection.js CollectionView", function(){
    var view, coll, filter;
    before(function(){
        coll = new m.Collection();
        // for(var i = 1; i <= 10; i++){
            // var mm = new m.Model({"property1":i});
            // mm.constructor.prototype.modelName = "thisIsTestCollectionModel";
            // collection.add(mm);
        // };
        view = new m.packages["MUON:admin"].views.collection.collection_data(coll);
        
    });
    describe("",function(){
        
    });
});


