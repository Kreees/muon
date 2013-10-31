m.ModelView.extend({
	rendered: function(){
		this.listenTo(this.context, 'destroy', this.remove);
	}
})
