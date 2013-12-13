m.ModelView.extend({
	rendered: function(){
		var _this = this;
		this.listenTo(this.context, 'destroy', this.remove);
		$("<td>").text("lolo").appendTo(this.$("tr"));
		this.$("a").attr({
			"data-route":"/data/model/"+this.model.constructor.modelName+"/"+this.model.id,
			"href":"/admin/data/model/"+this.model.constructor.modelName+"/"+this.model.id
		});
		this.$("tr").click(function(){
			m.router.navigate(_this.$("a").attr("href"));
		})
	}
})
