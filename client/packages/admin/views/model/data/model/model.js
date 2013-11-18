m.ModelView.extend({
	events:{
		"click #save_model":"save",
		"click #save_asnew_model":"saveNewModel",
		"click #remove_model":"removeModel",
		"click .model_data_show_subattr":"showSubattr"
	},
	postTemplateRender: function(){
		var atrs = this.context.attributes;
		this.originalAttributes = this.context.toJSON();
		window.mm = this.context;
		if(!this.context.get("_id")) this.$("#model_data_save").hide();
		for(var i in atrs){
			if(i == "_id") continue;
			try{
				this.renderAttribute(i).appendTo(this.$(".attributes_wrapper"));
			}catch(err){
				console.log("WARN!: catch error in rendering attribute "+i);
			}
		}
		// this.$("input.check_null").onclick(function(ev){
			// console.log("tut")
			// console.log(["checkbox ", $(ev.currentTarget).attr("data-attribute")]);
		// });
		
	},
	renderAttribute: function(attr){
		var _v = this;
		var _a = attr;
		var value = this.context.get(attr);
		var scheme = this.context.scheme[attr];
		if(!scheme) scheme={}; 
		
		var $el = $("<div></div>").addClass("attribute_wrap").attr("data-attribute", attr);
		$("<span></span>").addClass("type_wrap").text(scheme.type).appendTo($el);
		$("<span></span>").addClass("name_wrap").text(attr).appendTo($el);
		
		var $vwr=$("<div></div>").addClass("value_wrap").attr("data-attribute_name", attr);
		this.renderAttrValue(attr, value).appendTo($vwr); 
		$vwr.appendTo($el);
		
		var $nwrp = $("<div></div>").addClass("set_null_wrap").addClass("attr_sets");
		var $nsetter = $("<input></input>").attr({"type":"button", "data-attribute_name":attr, "value":"null"});
		if(attr=="src") console.log(scheme["null_allowed"] && scheme["null_allowed"] === true);
		if(scheme["null_allowed"] && scheme["null_allowed"] === true){}
		else $nsetter.attr("disabled", "true");
		$nsetter.click(function(){_v.setNullValue(_a, $vwr);});
		$nsetter.appendTo($nwrp);
		$nwrp.appendTo($el);
		
		var $dwrp = $("<div></div>").addClass("set_default_wrap").addClass("attr_sets");
		var $dsetter = $("<input></input>").attr({"type":"button",	"data-attribute_name":attr, "value":"default"});
		if(this.context.defaults[attr]){}
		else $dsetter.attr("disabled", true);
		$dsetter.click(function(){_v.setDefaultValue(_a, $vwr);});
		$dsetter.appendTo($dwrp);
		$dwrp.appendTo($el);
		
		var $owrp = $("<div></div>").addClass("set_original_wrap").addClass("attr_sets");
		var $osetter = $("<input></input>").attr({"type":"button", "data-attribute":attr, "value":"original"});
		$osetter.click(function(){_v.setOriginalValue(_a, $vwr);});
		$osetter.appendTo($owrp);
		$owrp.appendTo($el);
		
  		return $el;
	},
	
	setNullValue:function(attr, container){
		this.model.set(attr, null);
		if(!container){
			container = this.$("div.value_wrap[data-attribute_name="+attr+"]");
			if(!container){
				console.log("warning setDefaultValue");
				return this.renderAttrValue(attr);
			} 
		}
		container.html(this.renderAttrValue(attr));
	},
	
	setDefaultValue:function(attr, container){
		this.model.set(attr, this.model.defaults[attr]);
		if(!container){
			container = this.$("div.value_wrap[data-attribute_name="+attr+"]");
			if(!container){
				console.log("warning setDefaultValue");
				return this.renderAttrValue(attr);
			} 
		}
		container.html(this.renderAttrValue(attr));
	},
	
	setOriginalValue:function(attr, container){
		this.model.set(attr, this.originalAttributes[attr]);
		// console.log(this.originalAttributes[attr]);
		if(!container){
			container = this.$("div.value_wrap[data-attribute_name="+attr+"]");
			if(!container){
				console.log("warning setDefaultValue");
				return this.renderAttrValue(attr);
			} 
		}
		// container.html(this.renderAttrValue(attr));
	},
	
	renderAttrValue: function(attr){
		var value = this.model.get(attr);
		if(value != null && value == undefined) {alert("undefined attribute: "+attr); return $("<div>");}
		else{ if(value == null) return $("<span>").text("null");}
		//TODO 

		if(_.isArray(value)) return this.renderArrayValue(attr, value);
		else{
			if(_.isObject(value)){
				if(value instanceof m.Model){
				}else{
					this["get_"+attr] = function(){
						console.log([attr, "get", value]);
					 	var jsn = JSON.stringify(this.model.get(attr),null,'\t'),
							mch = jsn.match(/\t+/g),
							l = 1;
						if(mch) l = mch.length+2;
						this.$('.attribute_wrap[data-attribute='+attr+'] .item_content_edit_wrap textarea').attr({"rows":(l<20?l:20)});
						return jsn;
					};
					this["set_"+attr] = function(value){
						console.log([attr, "set", value]);
						$obj = this.$('textarea[data-model-set='+attr+']');
						try{
							obj = JSON.parse(value);
							$obj.removeClass("notvalid");
							this.model.set(attr, obj);
						}catch(err){
							$obj.addClass("notvalid");
						}
					}
				}
			}
			return this.renderValueItem(attr, value);
		} 
	},
	
	renderValueItem:function(attr, value){
		var ret = $("<div>").addClass("value_item_wrap");
		var view = this;
		if(_.isString(value)){
			$("<input></input>").attr({"type":"text","value": value,"data-model-set": attr,"size":value.length*1.2}).appendTo(ret);
			return ret;
		}
		if(_.isNumber(value)){
			$("<input></input>").attr({"type":"text","value": value,"data-model-set": attr,"size":value.length*1.2}).appendTo(ret);
			return ret;
		}
		if(_.isDate(value)){
			$("<input></input>").attr({"type":"text","value": value,"data-model-set": attr}).appendTo(ret);
			return ret;
		}
		if(_.isObject(value)){
			if(value instanceof m.Model){
				ret =  $("<span></span>").text("id: "+ value.id);
				// ret = $("<span></span>").text("id:").append($("<input></input>").attr({
					// "type": "text",
					// "value": value.id,
					// "data-attribute": attr
				// }));
				return ret;
			}
			
			$("<span>").text("Object").appendTo(ret);
			$("<input></input>").attr({"type": "button","value": "edit"}).appendTo(ret).click(function(){
				$(ret.find("div.item_content_edit_wrap")[0]).toggle();
			});
			$("<div>").addClass("item_content_edit_wrap")
				.append($("<textarea></textarea>").attr({"data-model-set":attr, "data-attr-type":"html"}))
				.appendTo(ret);
			return ret;
		}
		console.log("WARN!: Somthing wrong in renderValueItem");
	},
	renderArrayValue: function(attr, value){
		var ret = $("<input></input>");
		return ret;
	},
	renderVal: function(attr, value){
		
	},
	renderObjVal: function(){
		
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
		// this.$el.find("[data-model-set]").each(function(){
		    // var setter = this.dataset.modelSet;
		    // if (typeof view["set_"+setter] == "function"){ view["set_"+setter]($(this).val(), nm);}
		    // else nm.set(setter,$(this).val());
		// });
		nm.save({}, {success:function(obj){
			view.m.setProjection("editor.model", obj);
		}});
  	}
})
