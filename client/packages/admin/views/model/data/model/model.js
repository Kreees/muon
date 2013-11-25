m.ModelView.extend({
	events:{
		"click #save_model":"save",
		"click #save_asnew_model":"saveNewModel",
		"click #remove_model":"removeModel",
		"click .model_data_show_subattr":"showSubattr"
	},
	postTemplateRender: function(){
		var atrs = this.context.attributes;
		window.view = this;
		this.originalAttributes = this.context.toJSON();
		console.log(this.originalAttributes);
		window.mm = this.context;
		if(!this.context.get("_id")) this.$("#model_data_save").hide();
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
	initControllers: function(attr, flag){
		var type = this.model.scheme[attr].type;
		if(type.match(/\[|\]/g)){
			type = type.replace(/\[|\]/g,"");
			this[attr+"_controller"] = function(attr, cmd, value){
				if(this.commonController(attr, cmd, value)) return;
				this.arrayController(attr, cmd, value);
			}
			this[attr+"_viewController"] = function(attr, cmd, value){
				if(this.commonViewController(attr, cmd)) return;
				this.arrayViewController(attr, cmd, value);
			}
			var value = this.model.get(attr);
			console.log(["value", value])
			for( var i in value){
				var sub = attr+"_"+i;
				this.initElementController(sub, type);
				this[sub+"_viewController"] = this.initElementViewController(sub, type);
			}
			return;
		}
		this[attr+"_controller"] = this.commonController;
		this.initElementController(attr, type);
		var elemC = this.initElementViewController(attr, type);
		this[attr+"_viewController"] = function(attr, cmd){
			if(this.commonViewController(attr, cmd)) return;
			elemC(attr, cmd);
		}
	},
	initElementController: function(attr, type){
		var a_name = this.splitAttr(attr);
		var index = this.splitIndex(attr);
		if(!a_name) a_name=attr; 
		switch(type){
			case "string":
				break;
				
			case "object":
				console.log(["init element", attr, type]);
				this["get_"+attr] = function(){
					console.log([attr, "get", this]);
				 	var jsn;
				 	var value = this.model.get(a_name);
			 		if(index != undefined && value) jsn = JSON.stringify(value[index],null,'\t');
			 		else jsn = JSON.stringify(value, null, '\t')
					var mch = jsn.match(/\t+/g),
						l = 1;
					if(mch) l = mch.length+2;
					this.$('textarea[data-model-set='+attr+']').attr({"rows":(l<20?l:20)}).removeClass("notvalid");
					return jsn;
				};
				this["set_"+attr] = function(value){
					console.log([attr, "set", value]);
					$obj = this.$('textarea[data-model-set='+attr+']');
					try{
						obj = JSON.parse(value);
						$obj.removeClass("notvalid");
						if(index == undefined) this.model.set(a_name, obj);
						else{
							var val = this.model.get(a_name);
							val[index] = obj;
							this.model.set(a_name, val);
						}
					}catch(err){
						$obj.addClass("notvalid");
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
		if(index != undefined){
			console.log(["init element", attr, type]);
			this["get_"+attr] = function(){
				console.log([attr, "get"]);
				var value = this.model.get(a_name);
				if(value) return value[index];
				else return "";
			}
			this["set_"+attr] = function(value){
				console.log([attr, "set", value]);
				var val = this.model.get(a_name);
				val[index] = value;
				this.model.set(a_name, val);
			}
		}
	},
	commonController: function(attr, cmd, value){
		switch(cmd){
			case "null":{
				if(this.model.scheme[attr]["null-allowed"] == false) return false;
				this.model.set(attr, null);
				this[attr+"_viewController"](attr,"null");
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
				this.model.set(attr, this.originalAttributes[attr]);
				this[attr+"_viewController"](attr,"value");
				return true;
			}
			case "default":{
				if (_.isEqual(this.model.defaults[attr],"")) this.model.set(attr,"");
				else this.model.set(attr, "  ");
				this.model.set(attr, this.model.defaults[attr]);
				this[attr+"_viewController"](attr,"value");
				return true;
			}
		}
		return false;
	},
	arrayController: function(attr, cmd, value){
		switch(cmd){
			case "addItem":{
				var val = this.model.get(attr);
				if(value) val.push(value);
				else{
					
					var type = this.model.scheme[attr].type.replace(/\[|\]/g,"");
					switch(type){
						case "string":value = new String(); break;
						case "object": value = new Object(); break;
						case "number":
							value = new Number();
							break;
						case "date":
							break;
						case "model":
							break;
					}
					var l = val.push(value);
					var sub = attr+"_"+(l-1);
					console.log(["add", sub, type, value]);
					this.initElementController(sub, type);
					this[sub+"_viewController"] = this.initElementViewController(sub, type);
					this[attr+"_viewController"](sub, "addItem", value);
					this.model.set(val)
				}
				break;
			}
			case "removeItem":{
				console.log(["remove", attr])
				var a_name = this.splitAttr(attr);
				var index = this.splitIndex(attr);
				var val = this.model.get(a_name);
				val.splice(index,1);
				this[a_name+"_viewController"](attr, "removeItem");
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
				return true;
			}
			case "value":{
				this.$(".set_null_wrap input[data-attribute_name="+attr+"]").removeClass("green");
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap").show();
				return true;
			}
		}
	},
	arrayViewController: function(attr, cmd, value){
		switch(cmd){
			case "maximize":{
				this.$(".array_wrap[data-attribute_name="+attr+"]").show();
				break;
			}
			case "minimize":{
				this.$(".array_wrap[data-attribute_name="+attr+"]").hide();
				break;
			}
			case "addItem":{
				var _v = this;
				var _a = this.splitAttr(attr);
				console.log(["view Controller", attr, value]);
				var $ret = this.$(".array_wrap[data-attribute_name="+_a+"]");
				var sub = attr;
				var $sub = $("<div>").addClass("array_element_wrap").attr({"data-attribute_name":sub});
				this.renderElement(sub, value).appendTo($sub);
				var $rmv =$("<input></input>").attr({"type":"button", "data-attribute_name":sub, "value":"remove"});
				$rmv.click(function(){
					_v[_a+"_controller"](sub, "removeItem");
				});
				$rmv.appendTo($sub);
				$sub.appendTo($ret);
				break;
			}
			case "removeItem":{
				var _a = this.splitAttr(attr);
				console.log(this.$(".array_element_wrap[data-attribute_name="+attr+"]"));
				this.$(".array_element_wrap[data-attribute_name="+attr+"]").remove();
				var $ret = this.$(".array_wrap[data-attribute_name="+_a+"] ");
				break;
			}
			case "moveItem":{
				break;
			}
		}
	},
	initElementViewController: function(attr, type){
		switch(type){
			case "string":
				break;
				
			case "object":
				return function(attr, cmd){
							switch(cmd){
								case "maximize":{
									this.$(".element_wrap[data-attribute_name="+attr+"]").show();
									break;
								}
								case "minimize":{
									this.$(".element_wrap[data-attribute_name="+attr+"]").hide();
									break;
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
	
	renderAttrValue: function(attr){
		var value = this.model.get(attr);
		var type = this.model.scheme[attr].type;
		if(value != null && value == undefined) {alert("undefined attribute: "+attr); return $("<div>");}
		// else{ if(value == null) return $("<span>").text("null");}
		//TODO 
		if(_.isArray(value)) return this.renderArrayValue(attr, value);
		return this.renderElement(attr, value);
	},
	renderArrayValue: function(attr, value){
		var _v = this;
		var _a = attr;
		var ret = $("<div>").addClass("array_wrap").attr({"data-attribute_name":attr});
		for(var i in value){
			var sub = attr+"_"+i;
			var $sub = $("<div>").addClass("array_element_wrap").attr({"data-attribute_name":sub});
			this.renderElement(sub, value[i]).appendTo($sub);
			var $rmv =$("<input></input>").attr({"type":"button", "data-attribute_name":sub, "value":"remove"});
			$rmv.click(function(){
				console.log(sub);
				_v[_a+"_controller"](sub, "removeItem");
			});
			$rmv.appendTo($sub);
			$sub.appendTo(ret);
		}
		var $add = $("<input></input>").attr({"type":"button", "data-attribute_name":attr, "value":"add"});
		$add.click(function(){
			console.log(["add"]);
			_v[_a+"_controller"](_a, "addItem");
			});
		$add.appendTo(ret);
		return ret;
	},
	renderElement:function(attr, value){
		var ret = $("<div>").addClass("element_wrap").attr({"data-attribute_name":attr});
		var view = this;
		if(_.isString(value)){
			$("<input></input>").attr({"type":"text","data-model-set": attr,"size":value.length*1.2}).appendTo(ret);
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
				return ret;
			}
			
			$("<span>").text("Object").appendTo(ret);
			$("<input></input>").attr({"type": "button","value": "edit"}).appendTo(ret).click(function(){
				$(ret.find("div.item_content_edit_wrap")[0]).toggle();
			});
			$("<div>").addClass("item_content_edit_wrap")
				.append($("<textarea></textarea>").attr({"data-model-set":attr}))
				.appendTo(ret);
			return ret;
		}
		console.log("WARN!: Something wrong in renderValueItem");
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
