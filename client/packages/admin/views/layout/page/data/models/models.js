m.ModelsDataPageLayoutView = m.LayoutView.extend({
	rendered: function(){
		for(var i in m.models){
			var $el = $("<a class='span3'>").attr({
				"data-route":"/data/model/"+i,
				"href":"/admin/data/model/"+i,
			});
			$("<div class='item-wrap'>").append("<span>"+i+"</span>").appendTo($el);
			this.$(".row#items").append($el);
		}
	}
});
