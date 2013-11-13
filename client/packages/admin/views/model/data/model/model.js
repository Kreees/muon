m.ModelView.extend({
	events:{
		"click #save_model":"save",
		"click #save_asnew_model":"saveNewModel",
		"click #remove_model":"removeModel",
		"click .model_data_show_subattr":"showSubattr"
	},
	rendered: function(){
		console.log("rendered!!")
		var atrs = this.context.attributes;
		window.mm = this.context;
		if(!this.context.get("_id")) this.$("#model_data_save").hide();
		for(var i in atrs){
			if(i == "_id") continue;
			this.renderAttribute(i).appendTo(this.$(".attributes_wrapper"));
		}
		this.$("input.check_null").onclick(function(ev){
			console.log("tut")
			console.log(["checkbox ", $(ev.currentTarget).attr("data-attribute")]);
		});
		
	},
	renderAttribute: function(attr){
		var value = this.context.get(attr);
		var sch = this.context.scheme[attr];
		if(!sch) sch={}; 
		
		var $el = $("<div></div>").addClass("attribute_wrap").attr("data-attribute", attr);
		$("<span></span>").addClass("type_wrap").text(sch.type).appendTo($el);
		$("<span></span>").addClass("name_wrap").text(attr).appendTo($el);
		$("<div></div>").addClass("value_wrap").text("Value container").appendTo($el);
		
		var $null = $("<div></div>").addClass("null_wrap");
		
		if(sch["null_allowed"] && sch["null_allowed"] === true){
			$("<span></span>").text("null").appendTo($null);
			$('<input></input>').attr({
				"type":"checkbox",
				"data-attribute":attr
			}).addClass("check_null").appendTo($null);
		}
		$null.appendTo($el);
		
  		return $el;
  		
  		// if("object" == typeof atrs[i] && atrs[i].constructor != String){
  		
  		// if("string" == typeof value && value.length > 75){
  			// $("<textarea></textarea>").attr({
	  			// "data-model-set": att,
	  			// "rows":4
	  		// }).text(value).appendTo($value);
  		// }else{
  			// $("<input></input>").attr({
	  			// "type":"text",
	  			// "data-model-set": att,
	  			// "value": value,
	  			// "size":value.length*1.2
	  		// }).appendTo(dv);
  		// }	
  		
	},
	renderElement: function(){
		
	},
	
	_setObjAttr:function(attr, model){
		console.log(["SET ATTR ", attr, model]);	
		console.log([model,this.context]);
		if(!model) model=this.context;
		var attrValue = this.context.get(attr);
        var $subElement = this.$el.find("[data-model-set-sub^='"+attr+"']");
        if (!$subElement.length) return;
        $subElement.each(function(){
        	 // console.log(["sub element ", $(this).val()]);
            var attrsList = this.dataset["modelSetSub"].split(".");
            // console.log(attrsList);
           	attrsList.shift();
            var container = attrValue;
            try {
                while(attrsList.length != 1){
                	var key = attrsList.shift();
                	container = container[key];
                	if("object" == typeof container && container.constructor != String){
                	}else{ console.log(["sub elem error", attrsList]); return;}
                }
            }
            catch(e){
                console.log(["sub elem error", attrsList]); return;
            }
            container[attrsList.shift()] = $(this).val();
        });
        console.log(["Ready",attrValue]);
        // model.set(attr,attrValue);
		
		
		
	},
	_renderObjAttr:function(att, obj){
		this["set_"+att] = function(value, model){this._setObjAttr(att, model);};
		var dv = $("<div></div>").append($("<label></label>").text(att+":")).append($("<a></a>").attr({"data-model-set": att}).text("Object"));
		var btn = $("<input>").attr({
				"type":"button",
				"value":"V",
				"class":"_inline model_data_show_subattr",
				"data-attribute":att
			}).appendTo(dv);
		var cnt = $("<div></div>").attr({
	  			"data-attribute": att,
	  		}).show();
		this._renderSubattribute(null, att, obj).appendTo(cnt);
		cnt.appendTo(dv);
	  	return dv;
	},
	showSubattr:function(ev){
		var attr=$(ev.currentTarget).attr("data-attribute");
		var cnt = $("div[data-attribute="+attr+"]");
		if(!cnt.html() || cnt.html() == "") this._renderSubattribute(null,attr,this.context.get(attr)).appendTo(cnt);
		cnt.toggle();
	},
	_renderSubattribute: function(prntKey, key, obj){
		// console.log(["1", prntKey, key, obj]);
		var dv;
		var cnt = $("<div></div>").addClass("obj_container");
		var newkey = prntKey+"."+key;
		if(!prntKey) newkey = key;
		else dv = $("<div></div>").append($("<label></label>").text(key+":"));
		for(var i in obj){
			// console.log([i,obj[i].constructor])
			if("object" == typeof obj[i] && obj[i].constructor != String){
				this._renderSubattribute(newkey, i, obj[i]).appendTo(cnt);
			}else{
				// console.log(["4"]);
				var dvv = $("<div></div>");
		  		$("<label></label>").text(i+":").appendTo(dvv);
		  		if(obj[i].length > 75){
		  			$("<textarea></textarea>").attr({
			  			"class":"_inline",
			  			"data-model-set-sub": newkey+"."+i,
			  			"rows":4
			  		}).text(obj[i]).appendTo(dvv);
		  		}else{
		  			$("<input></input>").attr({
			  			"type":"text",
			  			"class":"_inline",
			  			"data-model-set-sub": newkey+"."+i,
			  			"value": obj[i],
			  			"size":obj[i].length*1.2
			  		}).appendTo(dvv);
		  		}
		  		dvv.appendTo(cnt);
		  		// console.log(["5",dvv]);
			}
		}
		if(!dv) return cnt;
		cnt.appendTo(dv);
		return dv;
	},
	removeModel: function(){
	  	if(this.context) this.context.destroy();
	},
	saveNewModel: function(){
		var view = this;
		var nm = new this.context.constructor();
		var att = this.context.toJSON();
		delete att[this.context.idAttribute];
		nm.set(att);
		this.$el.find("[data-model-set]").each(function(){
		    var setter = this.dataset.modelSet;
		    if (typeof view["set_"+setter] == "function"){ view["set_"+setter]($(this).val(), nm);}
		    else nm.set(setter,$(this).val());
		});
		nm.save({}, {success:function(obj){
			view.m.setProjection("editor.model", obj);
		}});
  	}
})
