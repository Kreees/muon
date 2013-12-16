m.CollectionView.extend({
	target:"list",
	modelView:"item_data",
	rendered:function(){
		// console.log(["rerender Collection "]);
		this.setAttrFilter(5);
		this.listenTo(this.context, "sync", this.resize);
		this.listenTo(this.context, "remove", this.resize);
		this.listenTo(this.context, "add", this.__addItem);
		this.resize();
	},
	resize:function(){
		// console.log("resize")
		var start = this.context.startNum;
		for(var i in this.childModels){
			this.childModels[i].filterAttributes(this.attributes);
			this.childModels[i].setNumber(++start);
		}
	},
	__addItem: function(ev){
		// console.log(["__addItem",ev]);
	},
	setAttrFilter: function(num){
		var filter = [];
		var _empt = new this.collection.model();
		filter.push(_empt.idAttribute);
		var iter = num;
		for(var i in _empt.attributes){
			if(iter == 0) break;
			filter.push(i);
			iter--;
		}
		this.filterAttributes(filter);
		this.attributes = filter;
	},
	filterAttributes: function(items){
		this.$("thead tr").html("")
		$("<th>").text("#").appendTo(this.$("thead tr")); 
		if(items){
			for(var i in items){
				$("<th>").text(items[i]).appendTo(this.$("thead tr"));
			}
		}
		
	}
	
})
