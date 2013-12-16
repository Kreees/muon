m.CollectionView.extend({
	target:"list",
	modelView:"item_data",
	rendered:function(){
		this.listenTo(this.context, "sync", this.resize);
		this.listenTo(this.context, "remove", this.resize);
		this.listenTo(this.context, "add", this.resize);
		this.resize();
	},
	resize:function(){
		this.$("label#c_size").text(this.context.length);
		var start = this.context.startNum;
		this.$("tr td:first-child").each(function(){
			$(this).text(++start);
		})
		// console.log(["li ",this.$("tr").length]);
		
	}
})
