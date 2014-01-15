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
		})
		this.filterAttributes();
	},
	setNumber: function(num){
		this.$("td._number").text(num);
	},
	filterAttributes: function(items){
	    if(!this.$el){console.log("empty ModelView"); return;}
		this.$el.html("");
		$("<td class='_remove'>").html('<input type="checkbox" class="_remove">').appendTo(this.$el); 
		$("<td class='_number'>").text("#").appendTo(this.$el); 
		if(items){
			for(var i in items){
				$("<td>").text(this.model.get(items[i])).appendTo(this.$el);
			}
		}
	}
})
