m.ModelView.extend({
	events:{
		"click #save_model":"saveModel",
		"click #save_asnew_model":"saveNewModel",
		"click #remove_model":"removeModel",
		"click .model_data_show_subattr":"showSubattr"
	},
	postTemplateRender: function(){
		// console.log("rerender");
		var atrs = this.model.attributes;
		window.view = this;
		window.mm = this.model;
		this.nullSets = [];
		this.originalAttributes = this.model.toJSON();
		if(!this.model.get("_id")) this.$("#model_data_save").hide();
		for(var attr in atrs){
			if(attr == "_id") continue;
			try{
				if(!this.model.scheme[attr]){
					try{this.renderAttribute(attr).appendTo(this.$(".attributes_wrapper"));
					this.message("No scheme for attribute: "+attr);
					}catch(err){console.log("WARN!: catch error in rendering attribute "+i);}
					continue;
				}
				if(this.model.scheme[attr].nullAllowed == false && (this.model.get(attr) === null || this.model.defaults[attr] === null)){
					try{this.renderAttribute(attr).addClass("notvalid").appendTo(this.$(".attributes_wrapper"));
					this.message("Wrong scheme for attribute: "+attr);
					}catch(err){console.log("WARN!: catch error in rendering attribute "+i);}
					continue;
				}
				var type = this.model.scheme[attr].type;
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
				}else{
					this[attr+"_controller"] = this.commonController;
					this.initElementController(attr, type);
					this[attr+"_viewController"] = function(attr, cmd, obj){
						this.commonViewController(attr, cmd, obj);
					}
				}
				try{this.renderAttribute(attr).appendTo(this.$(".attributes_wrapper"));
				}catch(err){console.log("WARN!: catch error in rendering attribute "+i);}
				if(this.model.get(attr) === null) this[attr+"_controller"](attr, "null");	
				
			}catch(err){console.log("WARN!: catch error in initializing controllers for attribute "+i);}
		}
	},
	
	message: function(msg){
		if(msg == undefined){ this.$("#message").html(""); return;}
		this.$("#message").append("<p>"+msg+"</p>");
		
	},
	initElementController: function(attr, type){
		if(m.models[type]) return;
		switch(type){
			case "object":
				this["get_"+attr] = function(el){
					// console.log([attr, "get", el]);
					if(this.model.get(attr) === null) return null;
					var jsn = JSON.stringify(this.model.get(attr), null, '\t');
					var mch = jsn.match(/\t+/g), l = 1;
					if(mch) l = mch.length+2;
					this.$('textarea[data-model-set='+attr+']').attr({"rows":(l<20?l:20)}).removeClass("notvalid");
					return jsn;
				};
				this["set_"+attr] = function(value, el){
					// console.log([attr, "set", value, el]);
					try{
						obj = JSON.parse(value);
						$(el).removeClass("notvalid");
						this.model.set(attr, obj);
					}catch(err){$(el).addClass("notvalid");}
				};
				return;
				
			case "number":
				this["set_"+attr] = function(value, el){
					// console.log([attr, "set", value, el]);
 					var obj = parseFloat(value, 10);
					if(obj != value) $(el).addClass("notvalid");
					else{
						$(el).removeClass("notvalid");
						this.model.set(attr, obj);
					}
				};
				return;
			case "string": 
			case "date": break;
		}
	},
	initArrayElementController: function(attr, type){
		if(m.models[type]){
			this["get_"+attr] = function(el){
				// console.log([attr, "get", el]);
				if(this.model.get(attr) === null) return null;
				var indx = this.getDataSetArrayElementIndex(el);
				if(indx != undefined) return this.model.get(attr)[indx];
				else return this.model.get(attr);
			};
			return;
		}
		switch(type){
			case "object":
				this["get_"+attr] = function(el){
					// console.log([attr, "get", this.getDataSetArrayElementIndex(el) ]);
					if(this.model.get(attr) === null) return null;
					var jsn;
				 	var value = this.model.get(attr);
				 	var indx = this.getDataSetArrayElementIndex(el);
					if(indx != undefined){ //TODO for many
						jsn = JSON.stringify(value[indx], null, '\t');
					}else return value;
					var mch = jsn.match(/\t+/g), l = 1;
					if(mch) l = mch.length+2;
					if(el.tagName == "TEXTAREA") $(el).attr({"rows":(l<20?l:20)}).removeClass("notvalid");
					return jsn;
				};
				this["set_"+attr] = function(value, el){
					// console.log([attr, "set", value, this.getDataSetArrayElementIndex(el)]);
					var indx = this.getDataSetArrayElementIndex(el);
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
			case "number":
				this["get_"+attr] = function(el){
					// console.log([attr, "get", this.getDataSetArrayElementIndex(el), ]);
					if(this.model.get(attr) === null) return null;
				 	var indx = this.getDataSetArrayElementIndex(el);
					if(indx != undefined){
						$(el).removeClass("notvalid"); 
						return this.model.get(attr)[indx];
					}else return this.model.get(attr);
				};
				this["set_"+attr] = function(value, el){
					// console.log([attr, "set", value, el]);
					var indx = this.getDataSetArrayElementIndex(el);
					obj = parseFloat(value, 10);
					if(obj != value) $(el).addClass("notvalid");
					else{
						$(el).removeClass("notvalid");
						if(indx != undefined){
							var val = this.model.get(attr);
							val[indx] = obj;
							this.model.set(attr, val);
						}
					}
				};
				return;	break;
			case "date": case "string":
			default:
				this["get_"+attr] = function(el){
					// console.log([attr, "get", this.model.get(attr), this.getDataSetArrayElementIndex(el)]);
					if(this.model.get(attr) === null) return null;
					var indx = this.getDataSetArrayElementIndex(el);
					$(el).removeClass("notvalid"); 
					if(indx != undefined) return this.model.get(attr)[indx];
					else return this.model.get(attr);
				}
				this["set_"+attr] = function(value, el){
					// console.log([attr, "set", value]);
					var val = this.model.get(attr);
					var indx = this.getDataSetArrayElementIndex(el);
					if(indx != undefined){
						val[indx] = value;
						this.model.set(attr, val);
					}
				}
		}
	},
	getDataSetArrayElementIndex:function(el){
		return $(el).closest("div.array_element_wrap").prevAll().length;
	},
	commonController: function(attr, cmd, value){
		switch(cmd){
			case "null":{
				if(this.model.scheme[attr]["nullAllowed"] == false) {
					this.message("Try to set null nullAllowed-false attribute: "+attr);
					return false;
				}
				if(this.model.get(attr) !== null){
					if(this.nullSets.indexOf(attr) == -1) this.nullSets.push(attr);
				}
				this[attr+"_viewController"](attr, "null");
				return;
			}
			case "unNull":{
				if(this.model.get(attr) === null){
					var value,
						type = this.model.scheme[attr].type;
					if(type.match(/\[|\]/g)){
						type = type.replace(/\[|\]/g,"");
						value = [];
					}else{
						if(m.models[type])value = "";
						else{
							switch(type){
								case "string": value = new String(); break;
								case "object": value = new Object(); break;
								case "number": value = new Number(); break;
								case "date": value = new Date(); break;
							}
						}  
					}
					this[attr+"_viewController"](attr, "rerender", value);
					this.model.set(attr, value)
				}else{
					if(this.nullSets.indexOf(attr) != -1) this.nullSets.splice(this.nullSets.indexOf(attr),1);
				}
				this[attr+"_viewController"](attr,"value");
				return;
			}
			case "original":{
				if(this.originalAttributes[attr] === null){ this[attr+"_controller"](attr,"null"); return;}
				if (_.isEqual(this.originalAttributes[attr],"")) this.model.set(attr,"");
				else this.model.set(attr, "  ");
				this[attr+"_viewController"](attr, "rerender", this.originalAttributes[attr]);
				this.model.set(attr, this.originalAttributes[attr]);
				this[attr+"_controller"](attr,"unNull");
				return;
			}
			case "default":{
				if(this.model.defaults[attr] === null){ this[attr+"_controller"](attr,"null"); return;}
				if (_.isEqual(this.model.defaults[attr],"")) this.model.set(attr,"");
				else this.model.set(attr, "  ");
				this[attr+"_viewController"](attr, "rerender", this.model.defaults[attr]);
				this.model.set(attr, this.model.defaults[attr]);
				this[attr+"_controller"](attr,"unNull");
				return;
			}
		}
	},
	arrayController: function(attr, cmd, obj){
		switch(cmd){
			case "addItem":{
				// console.log(["addItem", attr, obj]);
				var val = this.model.get(attr);
				var value = obj;
				if(value == undefined){
					var type = this.model.scheme[attr].type.replace(/\[|\]/g,"");
					if(m.models[type]){ 
						value = ""; 
					}else{
						switch(type){
							case "string": value = new String(); break;
							case "object": value = new Object(); break;
							case "number": value = new Number(); break;
							case "date": value = new Date(); break;
						}
					}  
				}else { console.log("ERROR in arrayController.addItem "+attr); return;}
				var l = val.push(value);
				this[attr+"_viewController"](attr, "addItem", l-1);
				this.model.set(attr, val)
				break;
			}
			case "removeItem":{
				// console.log(["removeItem", attr, obj])
				var val = this.model.get(attr);
				var indx = obj.prevAll().length;
				if(indx != undefined){
					val.splice(indx,1);
					this[attr+"_viewController"](attr, "removeItem", obj);
					this.model.set(attr, val);
				}
				break;
			}
			case "moveItem":{
				
				break;
			}				
		}
	},
	commonViewController: function(attr, cmd){
		switch(cmd){
			case "null":{
				this.$(".set_null_wrap input[data-attribute_name="+attr+"]").addClass("green");
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap").hide();
				return;
			}
			case "value":{
				this.$(".set_null_wrap input[data-attribute_name="+attr+"]").removeClass("green");
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap").show();
				return;
			}
		}
	},
	arrayViewController: function(attr, cmd, obj){
		switch(cmd){
			case "rerender":{
				this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap").html("");
				var $el=this.$(".value_wrap[data-attribute_name="+attr+"] .nonzero_wrap");
				if(!obj) obj =  this.model.get(attr);
				this.renderArrayValue(attr, obj).appendTo($el);
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
				// console.log([" addItem view Controller", attr, obj]);
				var $ret = this.$(".element_list_wrap[data-attribute_name="+attr+"] ");
				this.renderArrayElement(attr).appendTo($ret);
				break;
			}
			case "removeItem":{
				// console.log([" removeItem view Controller", attr, obj]);
				obj.remove();
				break;
			}
			case "moveItem":{
				break;
			}
		}
	},
	renderAttribute: function(attr){
		var _v = this;
		var _a = attr;
		var value = this.model.get(attr);
		var scheme = this.model.scheme[attr];
		
		var $el = $("<div></div>").addClass("attribute_wrap").attr("data-attribute", attr);
		if(scheme) $("<span></span>").addClass("type_wrap").text(scheme.type).appendTo($el);
		else  $("<span></span>").addClass("type_wrap").text("undefined").appendTo($el);
		$("<span></span>").addClass("name_wrap").text(attr).appendTo($el);
		
		var $vwr=$("<div></div>").addClass("value_wrap").attr("data-attribute_name", attr);
		this.renderValue(attr, value).appendTo($vwr);
		$vwr.appendTo($el);
		
		
		var $nwrp = $("<div></div>").addClass("set_null_wrap").addClass("attr_sets");
		var $nsetter = $("<input></input>").attr({"type":"button", "data-attribute_name":attr, "value":"null"});
		if(scheme && scheme["nullAllowed"] && scheme["nullAllowed"] === true){
			$nsetter.click(function(ev){
				if($(ev.currentTarget).hasClass("green")){
					_v[_a+"_controller"](_a, "unNull");
				}else _v[_a+"_controller"](_a, "null");
			});
		}
		else $nsetter.attr("disabled", "true");
		$nsetter.appendTo($nwrp);
		$nwrp.appendTo($el);
		
		var $dwrp = $("<div></div>").addClass("set_default_wrap").addClass("attr_sets");
		var $dsetter = $("<input></input>").attr({"type":"button",	"data-attribute_name":attr, "value":"default"});
		if(this.model.defaults[attr] === undefined) $dsetter.attr("disabled", true);
		else{
			$dsetter.click(function(){
				_v[_a+"_controller"](_a, "default");
			});
		}
		
		$dsetter.appendTo($dwrp);
		$dwrp.appendTo($el);
		
		var $owrp = $("<div></div>").addClass("set_original_wrap").addClass("attr_sets");
		var $osetter = $("<input></input>").attr({"type":"button", "data-attribute":attr, "value":"original"});
		if(!scheme) $osetter.attr("disabled", true);
		else{
			$osetter.click(function(){
				_v[_a+"_controller"](_a, "original");
			});
		}
		
		$osetter.appendTo($owrp);
		$owrp.appendTo($el);
		
  		return $el;
	},
	renderValue: function(attr, value){
		var scheme = this.model.scheme[attr];
		if(!scheme) return this.renderElement(attr);
		else{
			if(scheme.type.match(/\[|\]/g)) return this.renderArrayValue(attr, value); 
			else return this.renderElement(attr);
		} 
	},
	renderArrayValue: function(attr, value){
		// console.log(["render Array Element", attr, value])
		var _v = this;
		var _a = attr;
		var ret = $("<div>").addClass("array_wrap nonzero_wrap").attr({"data-attribute_name":attr});
		var list = $("<div>").addClass("element_list_wrap").attr({"data-attribute_name":attr});
		for(var i in value){
			this.renderArrayElement(attr).appendTo(list);
		}
		list.appendTo(ret);
		$("<input></input>").attr({"type":"button", "data-attribute_name":attr, "value":"add"})
			.click(function(){
				_v[_a+"_controller"](_a, "addItem"); })
			.appendTo(ret);
		return ret;
	},
	renderArrayElement:function(attr){
		// console.log(["render Array Element", attr, indx])
		var _v = this;
		var _a = attr;
		var $el = $("<div class='array_element_wrap'>");
		this.renderElement(attr).appendTo($el);
		$("<input></input>").attr({"type":"button", "value":"remove"})
			.click(function(ev){
				_v[_a+"_controller"](attr, "removeItem", $el);	})
			.appendTo($el);
		return $el;
	},
	renderElement:function(attr){
		var ret = $("<div>").addClass("element_wrap nonzero_wrap").attr({"data-attribute_name":attr});
		var type = "undefined";
		if(this.model.scheme[attr]) type = this.model.scheme[attr].type;
		if(type.match(/\[|\]/g)) type = type.replace(/\[|\]/g,"");
		if(m.models[type]){
			$("<span>").text("id: ").appendTo(ret);
			var $el = $("<span>").attr({"data-model-get":attr});
			$el.appendTo(ret);
			// $("<input></input>").attr({"type": "button","value": "edit"}).appendTo(ret).click(function(){
			// });
			return ret;
		}
		switch(type){
			case "string":
				var $el = $("<input></input>").attr({"type":"text","data-model-set": attr});
				if(this.__rendered__) this.assignModelSetElement($el.get(0));
				$el.appendTo(ret);
				return ret;
				break;
				
			case "object":
				$("<span>").text("Object").appendTo(ret);
				$("<input></input>").attr({"type": "button","value": "edit"}).appendTo(ret).click(function(){
					$(ret.find("div.item_content_edit_wrap")[0]).toggle();
				});
				var $el = $("<div>").addClass("item_content_edit_wrap");
				var $set = $("<textarea></textarea>").attr({"data-model-set":attr}).appendTo($el);
				if(this.__rendered__) this.assignModelSetElement($set.get(0));
				$el.hide().appendTo(ret);
				return ret;
				break;

			case "number":
				var $el = $("<input></input>").attr({"type":"text","data-model-set": attr});
				if(this.__rendered__) this.assignModelSetElement($el.get(0));
				$el.appendTo(ret);
				return ret;
				break;
				
			case "date":
				var $el = $("<input></input>").attr({"type":"text","data-model-set": attr});
				if(this.__rendered__) this.assignModelSetElement($el.get(0));
				$el.appendTo(ret);
				return ret;
				break;
			default:
				var $el = $("<div></div>").attr({"data-model-attr": attr});
				if(this.__rendered__) this.assignModelSetElement($el.get(0));
				$el.appendTo(ret);
				return ret;
		}
		console.log("WARN!: Something wrong in renderValueItem");
	},
	removeModel: function(){
	  	if(this.model) this.model.destroy();
	},
	saveModel: function(){
		if(this.$(".notvalid").length != 0){
			if(!confirm("В аттрибутах модели имеются ошибки, нажмите ОК чтобы сохранить последние валидные значения, Отмена чтобы продолжить редактирование")){
				return;
			}
		}
		for(var i in this.nullSets){
			this.model.set(this.nullSets[i], null);
		}
		this.model.save({}, {silent:true, 
							success:function(obj){
							},error:function(obj){
							}});
		this.nullSets=[];
		this.$(".attribute_wrap .notvalid").removeClass("notvalid"); 
	},
	saveNewModel: function(){
		if(this.$(".notvalid").length != 0){
			if(!confirm("В аттрибутах модели имеются ошибки, нажмите ОК чтобы сохранить последние валидные значения, Отмена чтобы продолжить редактирование")){
				return;
			}
		}
		for(var i in this.nullSets){
			this.model.set(this.nullSets[i], null);
		}
		this.nullSets = [];
		var view = this;
		var nm = new this.model.constructor();
		var att = this.model.toJSON();
		delete att[this.model.idAttribute];
		nm.set(att);
		nm.save({}, {success:function(obj){
			view.m.setProjection("editor.model", obj);
		}});
		
  	}




		// var attrValue = this.model.get(attr);
        // var $subElement = this.$el.find("[data-model-set-sub^='"+attr+"']");
        // if (!$subElement.length) return;
        // $subElement.each(function(){
        	 // // console.log(["sub element ", $(this).val()]);
            // var attrsList = this.dataset[" "].split(".");
            // // console.log(attrsList);
           	// attrsList.shift();
            // var container = attrValue;
            // try {
                // while(attrsList.length != 1){
                	// var key = attrsList.shift();
                	// container = container[key];
                	// if("object" == typeof container && container.constructor != String){
                	// }else{ console.log(["sub elem error", attrsList]); return;}
                // }
            // }
            // catch(e){
                // console.log(["sub elem error", attrsList]); return;
            // }
            // container[attrsList.shift()] = $(this).val();
        // });
        // console.log(["Ready",attrValue]);
        // // model.set(attr,attrValue);

})
