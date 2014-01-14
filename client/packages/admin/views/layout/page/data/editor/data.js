m.DataPageLayoutView = m.LayoutView.extend({
	events:{
		"click a.data_item_id": "selectModel",
		"click #editor_idseach_button": "renderModel",
		"click #editor_filter_button": "filter",
		"change select#editor_select_model": "selectClass",
		"change select#editor_select_view": "selectView"
	},
	rendered: function(){
		var _=this;
		this.errflag; 
		this._m;
		this.cur_m;
		this.cur_c;
		for(var i in m.models){
			$("<option></option>").attr({"value":i,"class":"_select_option"}).text(i).appendTo(this.$("select#editor_select_model"));
		}
	},
	selectClass: function(ev){
		var _=this;
		this.message();
		_.$("#editor_idseach").val("");
		_.$("#editor_filter").val("");
		
		var md = $(ev.currentTarget).val();
		_.$("select#editor_select_view option._select_option").remove();
		_.$("#vb_container div").attr({"data-model-view": "empty"});
		
		var vws = m.packages.application.views.model;
		for(var i in vws){
			var item = RegExp("(_"+md+"$)|(^"+md+"$)").exec(i);
			if(item) $("<option></option>").attr({"value":i,"class":"_select_option"}).text(i).appendTo(this.$("select#editor_select_view"));
			
		}
		_._m = m.models[md];
		_.cur_m = new _._m;
		this.m.setProjection("editor.model", _.cur_m);
		console.log("CURRENT", _.cur_m);
		this.setCollection();
		
	},
	selectView: function(ev){
		this.message();
		this.$("#vb_container div").attr({
			"data-model-view": $(ev.currentTarget).val()
		});
		this.m.setProjection("editor.model", this.cur_m);
	},
	selectModel: function(ev){
		this.message();
		this.$("#editor_idseach").val($(ev.currentTarget).text());
		this.renderModel();
	},
	filter: function(ev){
		this.message();
		var _=this;
		if(!this._m) return this.message(this.$("select#editor_select_model"));
		var fi = this.$("input#editor_filter").val();
		if(!fi){
			if(fi=="") return this.setCollection({});
			this.message(this.$("#editor_filter"));
			this.setCollection();
		} 
		else{
			var arg;
			try{
				arg = JSON.parse(fi);
				if("number" === typeof arg){
					this.message(this.$("#editor_filter"));
					arg = undefined;
				}
			}
			catch(err){
				return this.message(this.$("#editor_filter"))
			}
			this.setCollection(arg);
		} 
	},
	renderModel: function(){
		this.message();
		var _=this;
		this.cur_m = undefined;
		var _id = this.$("#editor_idseach").val();
		if(!this._m) return this.message(this.$("select#editor_select_model"));
		if(!_id){
			this.cur_m = new this._m();
		}else { if(this.cur_c) this.cur_m = this.cur_c.where({"_id":_id})[0]; }
		if(!this.cur_m){
			this.cur_m = new this._m({"_id":_id});
			this.cur_m.fetch({
				success:function(obj){
					this.m.setProjection("editor.model", _.cur_m);
				},
				error:function(){
					_.message(_.$("#editor_idseach"));
					_.cur_m = new _._m();
					this.m.setProjection("editor.model", null);
				}
			});
		}else{
			this.m.setProjection("editor.model", _.cur_m);
		} 
	},
	setCollection: function(filter){
		var _=this;
		this.cur_c = undefined;
		if(!this._m) return this.message(this.$("select#editor_select_model"));
		if(!filter || "number" == typeof filter) this.cur_c = this._m.collection();
		else{
			this.cur_c = this._m.collection(filter);
			this.cur_c.fetch({
				success:function(obj){
				},
				error:function(){
					_.message(_.$("#coll_container"));
					if(_._m) _.cur_c = _._m.collection();
				}
			});
			window.cur_c = this.cur_c;
		} 
		this.m.setProjection("editor.coll", this.cur_c);
	},
	message:function(el){
		if(el) {
			el.addClass("notvalid");
			this.errflag = true;
		}else{
			if(this.errflag){
				this.$("*").removeClass("notvalid");
				this.errflag = false;
			} 
		} 
	}
});
