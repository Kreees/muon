m.ModelView.extend({
	events:{
		"click #save_model":"save",
		"click #save_asnew_model":"saveNewModel",
		"click #remove_model":"removeModel",
		"click .model_data_show_subattr":"showSubattr"
	},
	__setNew__: function(el){
    	var view = this;
        var setter = el.dataset.modelSet;
        var _this = el;
        var interval = null;
        view.listenTo(view.model,"sync",function(){
            __setGetElementValue__.call(_this,view,setter);
        });
        if (!(el.dataset.silent || view.silent)){
            $(el).keyup(function(){
                clearTimeout(interval);
                interval = setTimeout(function(){$(_this).trigger("change");},150);
            });
            $(el).change(function(){
                if (typeof view["set_"+setter] == "function") view["set_"+setter]($(el).val(),el);
                else view.model.set(setter,$(el).val());
            });
        }
    },
	postTemplateRender: function(){
		var atrs = this.model.attributes;
		window.view = this;
		this.originalAttributes = this.model.toJSON();
		console.log(this.originalAttributes);
		window.mm = this.model;
		if(!this.model.get("_id")) this.$("#model_data_save").hide();
		for(var i in atrs){
			if(i == "_id") continue;
			try{
				this.initControllers(i);
				this.renderAttribute(i).appendTo(this.$(".attributes_wrapper"));
				// this[i+"controller"](i);
			}catch(err){
				console.log("WARN!: catch error in rendering attribute "+i);
			}
		}
	},
	
	initControllers: function(attr){
		var type = this.model.scheme[attr].type;
		console.log(["init controllers", attr, type]);
		if(type.match(/\[|\]/g)){
			type = type.replace(/\[|\]/g,"");
			this[attr+"_controller"] = function(attr, cmd, value){
				this.commonController(attr, cmd, value);
				this.arrayController(attr, cmd, value);
			}
			this[attr+"_viewController"] = function(attr, cmd, value){
				this.commonViewController(attr, cmd);
				this.arrayViewController(attr, cmd, value);
			}
			this.initArrayElementController(attr, type);
			this[attr+"_elViewController"] = this.initElementViewController(type);
			return;
		}
		this[attr+"_controller"] = this.commonController;
		this.initElementController(attr, type);
		var elemC = this.initElementViewController(attr, type);
		this[attr+"_viewController"] = function(attr, cmd, obj){
			this.commonViewController(attr, cmd, obj);
			elemC(attr, cmd, obj);
		}
	},
	initElementController: function(attr, type){
		console.log(["init element", attr, type]);
		// var a_name = this.splitAttr(attr);
		// var index = this.splitIndex(attr);
		switch(type){
			case "string":
				break;
				
			case "object":
				this["get_"+attr] = function(el){
					console.log([attr, "get", el]);
					var jsn;
				 	var value = this.model.get(attr);
				 	jsn = JSON.stringify(value, null, '\t')
					var mch = jsn.match(/\t+/g),
						l = 1;
					if(mch) l = mch.length+2;
					this.$('textarea[data-model-set='+attr+']').attr({"rows":(l<20?l:20)}).removeClass("notvalid");
					return jsn;
				};
				this["set_"+attr] = function(value, el){
					console.log([attr, "set", value, el]);
					try{
						obj = JSON.parse(value);
						$(el).removeClass("notvalid");
						this.model.set(attr, obj);
					}catch(err){
						$(el).addClass("notvalid");
					}
				};
				return;
				break;
				
			case "number":
				break;
			case "date":
				break;
			case "model":
				break;
		}
	},
	initArrayElementController: function(attr, type){
		switch(type){
			case "string":
				break;
				
			case "object":
				
				this["get_"+attr] = function(el){
					console.log([attr, "get", el]);
					var jsn;
				 	var value = this.model.get(attr);
				 	var indx = $(el).parent().parent().prevAll().length;
					if(indx != undefined){ //TODO for many
						jsn = JSON.stringify(value[indx], null, '\t');
					}
					var mch = jsn.match(/\t+/g),
						l = 1;
					if(mch) l = mch.length+2;
					this.$('textarea[data-model-set='+attr+']').attr({"rows":(l<20?l:20)}).removeClass("notvalid");
					return jsn;
				};
				this["set_"+attr] = function(value, el){
					console.log([attr, "set", value, el]);
					var indx = $(el).parent().parent().prevAll().length;
					try{
						obj = JSON.parse(value);
						$(el).removeClass("notvalid");
						if(indx != undefined){
							var val = this.model.get(attr);
							val[indx] = obj;
							this.model.set(attr, val);
						}
					}catch(err){
						$(el).addClass("notvalid");
					}
				};
				return;
				break;
				
			case "number":
				break;
			case "date":
				break;
			case "model":
				break;
		}
		this["get_"+attr] = function(el){
			console.log([attr, "get"]);
			var value = this.model.get(attr);
			var indx = $(el).parent().parent().prevAll().length;
			if(indx != undefined) return value[indx];
			else return "";
		}
		this["set_"+attr] = function(value, el){
			console.log([attr, "set", value]);
			var val = this.model.get(attr);
			var indx = $(el).parent().parent().prevAll().length;
			if(value && indx != undefined){
				val[indx] = value;
				this.model.set(attr, val);
			}
		}
	},
	commonController: function(attr, cmd, value){
		switch(cmd){
			case "null":{
				if(this.model.scheme[attr]["null-allowed"] == false) return false;
				this[attr+"_viewController"](attr, "null");
				this.model.set(attr, null);
				return true;
			}
			case "value":{
				if(value == undefined) value=null; //TODO new type object
				this.model.set(attr, value);
				this[attr+"_viewController"](attr,"value");
				return true;
			}
			case "original":{
				if (_.isEqual(this.originalAttributes[attr],"")) this.model.set(attr,"");
				else this.model.set(attr, "  ");
				this[attr+"_viewController"](attr, "rerender", this.originalAttributes[attr]);
				this[attr+"_viewController"](attr,"value");
				
				this.model.set(attr, this.originalAttributes[attr]);
				return true;
			}
			case "default":{
				if (_.isEqual(this.model.defaults[attr],"")) this.model.set(attr,"");
				else this.model.set(attr, "  ");
				console.log(["1"]);
				this[attr+"_viewController"](attr, "rerender", this.model.defaults[attr]);
				console.log(["2"]);
				console.log([this.model.get(attr), this.model.defaults[attr]]);
				console.log(this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap [data-model-set]")[0].dataset)
				this.model.set(attr, this.model.defaults[attr]);
				console.log(["3"]);
				this[attr+"_viewController"](attr,"value");
				console.log(["4"]);
				return true;
			}
		}
		return false;
	},
	arrayController: function(attr, cmd, obj){
		switch(cmd){
			case "addItem":{
				console.log(["addItem", attr, obj]);
				var val = this.model.get(attr);
				var value = obj;
				if(value == undefined){
					var type = this.model.scheme[attr].type.replace(/\[|\]/g,"");
					switch(type){
						case "string":value = new String(); break;
						case "object": value = new Object(); break;
						case "number": value = new Number(); break;
						case "date": break;
						case "model": break;
					}
				}else { console.log("ERROR in arrayController.addItem "+attr); return;}
				var l = val.push(value);
				this[attr+"_viewController"](attr, "addItem", l-1);
				this.model.set(attr, val)
				break;
			}
			case "removeItem":{
				console.log(["removeItem", attr, obj])
				var val = this.model.get(attr);
				var indx = this.toNum(obj.attr("data-model-sub"));
				if(indx != undefined){
					val.splice(indx,1);
					this[attr+"_viewController"](attr, "removeItem", indx);
					this.model.set(attr, val);
				}
				break;
			}
			case "moveItem":{
				var a_name = this.splitAttr(attr);
				var index = this.splitIndex(attr);
				
				break;
			}				
		}
	},
	commonViewController: function(attr, cmd){
		switch(cmd){
			case "null":{
				this.$(".set_null_wrap input[data-attribute_name="+attr+"]").addClass("green");
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap").hide();
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap [data-model-set]").attr("data-silent", true);
				return true;
			}
			case "value":{
				this.$(".set_null_wrap input[data-attribute_name="+attr+"]").removeClass("green");
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap").show();
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap [data-model-set]").removeAttr("data-silent");
				return true;
			}
		}
	},
	arrayViewController: function(attr, cmd, obj){
		switch(cmd){
			case "rerender":{
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap").html("");
				var $el=this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap");
				if(!obj) obj =  this.model.get(attr);
				this.renderArrayValue(attr, obj, true).appendTo($el);
				break;
			}
			case "maximize":{
				this.$(".array_wrap[data-attribute_name="+attr+"]").show();
				break;
			}
			case "minimize":{
				this.$(".array_wrap[data-attribute_name="+attr+"]").hide();
				break;
			}
			case "addItem":{
				console.log([" addItem view Controller", attr, obj]);
				var $ret = this.$(".element_list_wrap[data-attribute_name="+attr+"] ");
				this.renderArrayElement(attr, obj, true).appendTo($ret);
				break;
			}
			case "removeItem":{
				console.log([" removeItem view Controller", attr, obj]);
				this.$(".element_list_wrap[data-attribute_name="+attr+"] .array_element_wrap[data-model-sub="+obj+"]").remove();
				break;
			}
			case "moveItem":{
				break;
			}
		}
	},
	initElementViewController: function(type){
		switch(type){
			case "string":
				break;
				
			case "object":
				return function(attr, cmd, value){
							switch(cmd){
								case "maximize":{
									this.$(".element_wrap[data-attribute_name="+attr+"]").show();
									break;
								}
								case "minimize":{
									this.$(".element_wrap[data-attribute_name="+attr+"]").hide();
									break;
								}
								case "resize":{
									
								}				
							}
						}
				break;
			case "number":
				break;
			case "date":
				break;
			case "model":
				break;
		}
		
		
		
	},
	splitAttr:function(attr){
		var a = attr.split("_");
		if(a.length == 2)  return a[0];
		return null;
	},
	splitIndex:function(attr){
		var a = attr.split("_");
		if(a.length == 2){
			var num = Number(a[1]);
			if(!isNaN(num)) return num;
		} 
		return undefined;
	},
	toNum:function(str){
		if(!str) return undefined;
		var num = Number(str);
		if(!isNaN(num)) return num;
		return undefined;
	},
	renderAttribute: function(attr){
		var _v = this;
		var _a = attr;
		var value = this.model.get(attr);
		var scheme = this.model.scheme[attr];
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
		$nsetter.click(function(ev){
			_v[_a+"_controller"](_a, "null");
			});
		$nsetter.appendTo($nwrp);
		$nwrp.appendTo($el);
		
		var $dwrp = $("<div></div>").addClass("set_default_wrap").addClass("attr_sets");
		var $dsetter = $("<input></input>").attr({"type":"button",	"data-attribute_name":attr, "value":"default"});
		if(this.model.defaults[attr]){}
		else $dsetter.attr("disabled", true);
		$dsetter.click(function(){
				_v[_a+"_controller"](_a, "default");
			});
		$dsetter.appendTo($dwrp);
		$dwrp.appendTo($el);
		
		var $owrp = $("<div></div>").addClass("set_original_wrap").addClass("attr_sets");
		var $osetter = $("<input></input>").attr({"type":"button", "data-attribute":attr, "value":"original"});
		$osetter.click(function(){
			_v[_a+"_controller"](_a, "original");
			});
		$osetter.appendTo($owrp);
		$owrp.appendTo($el);
		
  		return $el;
	},
	
	renderAttrValue: function(attr, value){
		if(value != null && value == undefined) {alert("undefined attribute: "+attr); return $("<div>");}
		// else{ if(value == null) return $("<span>").text("null");}
		//TODO 
		if(_.isArray(value)) return this.renderArrayValue(attr, value);
		return this.renderElement(attr, value);
	},
	renderArrayValue: function(attr, value, flag){
		console.log(["render Array Element", attr, value])
		var _v = this;
		var _a = attr;
		var ret = $("<div>").addClass("array_wrap nonzero_wrap").attr({"data-attribute_name":attr});
		var list = $("<div>").addClass("element_list_wrap").attr({"data-attribute_name":attr});
		for(var i in value){
			this.renderArrayElement(attr,i, flag).appendTo(list);
		}
		list.appendTo(ret);
		$("<input></input>").attr({"type":"button", "data-attribute_name":attr, "value":"add"})
			.click(function(){
				_v[_a+"_controller"](_a, "addItem"); })
			.appendTo(ret);
		return ret;
	},
	renderArrayElement:function(attr, indx, flag){
		console.log(["render Array Element", attr, indx])
		var _v = this;
		var _a = attr;
		var $el = $("<div>").addClass("array_element_wrap").attr({"data-model-sub": indx});
		this.renderElement(attr, indx,flag).appendTo($el);
		$("<input></input>").attr({"type":"button", "value":"remove"})
			.click(function(ev){
				_v[_a+"_controller"](attr, "removeItem", $el);	})
			.appendTo($el);
		return $el;
	},
	renderElement:function(attr, indx, flag){
		var ret = $("<div>").addClass("element_wrap nonzero_wrap").attr({"data-attribute_name":attr});
		var type = this.model.scheme[attr].type;
		if(type.match(/\[|\]/g)) type = type.replace(/\[|\]/g,"");
		switch(type){
			case "string":
				var $el = $("<input></input>").attr({"type":"text","data-model-set": attr});
				if(flag) this.__setNew__($el.get(0));
				$el.appendTo(ret);
				return ret;
				break;
				
			case "object":
				$("<span>").text("Object").appendTo(ret);
				$("<input></input>").attr({"type": "button","value": "edit"}).appendTo(ret).click(function(){
					$(ret.find("div.item_content_edit_wrap")[0]).toggle();
				});
				var $el = $("<div>").addClass("item_content_edit_wrap")
					.append($("<textarea></textarea>").attr({"data-model-set":attr}));
				if(flag) this.__setNew__($el.get(0));
				$el.appendTo(ret);
				return ret;
				break;

			case "number":
				var $el = $("<input></input>").attr({"type":"text","data-model-set": attr});
				if(flag) this.__setNew__($el.get(0));
				$el.appendTo(ret);
				return ret;
				break;
				
			case "date":
				var $el = $("<input></input>").attr({"type":"text","data-model-set": attr});
				if(flag) this.__setNew__($el.get(0));
				$el.appendTo(ret);
				return ret;
				break;
				
			case "model":
				
				break;
		}
		
		console.log("WARN!: Something wrong in renderValueItem");
	},
	
	_setObjAttr:function(attr, model){
		console.log(["SET ATTR ", attr, model]);	
		console.log([model,this.model]);
		if(!model) model=this.model;
		var attrValue = this.model.get(attr);
        var $subElement = this.$el.find("[data-model-set-sub^='"+attr+"']");
        if (!$subElement.length) return;
        $subElement.each(function(){
        	 // console.log(["sub element ", $(this).val()]);
            var attrsList = this.dataset[" "].split(".");
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
		if(!cnt.html() || cnt.html() == "") this._renderSubattribute(null,attr,this.model.get(attr)).appendTo(cnt);
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
	  	if(this.model) this.model.destroy();
	},
	saveNewModel: function(){
		var view = this;
		var nm = new this.model.constructor();
		var att = this.model.toJSON();
		delete att[this.model.idAttribute];
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
