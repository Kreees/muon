m.ModelView.extend({
	tagName: "tr",
	rendered: function(){
		// console.log("render item");
		var _this = this;
		this.listenTo(this.context, 'destroy', this.remove);
		this.$el.click(function(){
			m.router.navigate("/admin/data/model/"+_this.model.constructor.modelName+"/"+_this.model.id);
		})
	},
	setNumber: function(num){
		this.$("td._number").text(num);
	},
	filterAttributes: function(items){
		this.$el.html("");
		$("<td class='_number'>").text("#").appendTo(this.$el); 
		if(items){
			for(var i in items){
				$("<td>").text(this.model.get(items[i])).appendTo(this.$el);
			}
		}
	}
})
