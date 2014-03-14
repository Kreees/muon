// Устанавливает значение атрибутов в инпут

function __setGetElementValue__(view,getter){
    function set(val){
        var dataAttrType = this.getAttribute("data-attr-type");
        if (!dataAttrType){
            if (this.tagName == "INPUT" || this.tagName == "SELECT" || this.tagName == "TEXTAREA") $(this).val(val);
            else this.innerText = val;
        }
        else if (dataAttrType == "text") this.innerText = val;
        else if (dataAttrType == "html") this.innerHTML = val;
        else $(this).attr(dataAttrType,val);
    }
    if (typeof view["get_"+getter] == "function"){
        var val = view["get_"+getter](this);
        // Для деферед ответов
        if (val !== null && typeof val == "object" && "then" in val) val.then(set.bind(this));
        else set.call(this,val);
    }
    else set.call(this,view.model.get(getter));
}

function __updateModelView__(attrs){
    var _this = this;
    if (this.$el.find("[data-model-attr]").length != 0){
        for(var i in attrs){
            var dataAttrType = this.el.getAttribute("data-attr-type");
            var $subElement = this.$el.find("[data-model-attr^='"+i+"']");
            if (!$subElement.length) continue;
            $subElement.each(function(){
                var attrsList = this.getAttribute("data-model-attr").split(".");
                var attrValue = attrs[attrsList.shift()];
                try {
                    while(attrsList.length != 0){
                        attrValue = attrValue[attrsList.shift()];
                    }
                }
                catch(e){
                    attrValue = attrValue.toString();
                }
                if (!dataAttrType) this.innerText = attrValue;
                else if (dataAttrType == "text") this.innerText = attrValue;
                else if (dataAttrType == "html") this.innerHTML = attrValue;
                else $(this).attr(dataAttrType,attrValue);
            });
        }
    }
    
    // Если datamodelset and data-model-get назначены одновременно
    this.$el.find("[data-model-get],[data-model-set]").each(function(){
        __setGetElementValue__.call(this,_this,this.getAttribute("data-model-get") || this.getAttribute("data-model-set"));
    });
    __renderDataRoutes__.call(this);
}

m.ModelView = m.View.extend({
    viewType: "model",
    initialize: function(model){
        var _this = this;
        this.model = model;
        this.listenTo(model,"change",this.__update__);
        this.listenTo(model,"destroy",_this.remove);
        m.View.prototype.initialize.apply(this,arguments);
    },
    assignModelSetElement: function(el){
        var setter = el.getAttribute("data-model-set");
        var _this = el;
        var view = this;
        var interval = null;
        view.listenTo(view.model,"sync",function(){
            __setGetElementValue__.call(_this,view,setter);
        });
        if (!(el.getAttribute("data-silent") || view.silent || view.el.getAttribute("data-silent"))){
            $(el).keyup(function(){
                clearTimeout(interval);
                interval = setTimeout(function(){$(_this).trigger("change");},150);
            });
            $(el).change(function(){
                if (this.getAttribute("data-silent") || view.silent || view.el.getAttribute("data-silent")) return;
                if (typeof view["set_"+setter] == "function") view["set_"+setter]($(this).val(),this);
                else view.model.set(setter,$(this).val());
            });
        }    	
    },
    __set__: function(){
        __updateModelView__.call(this,this.model.attributes);
        var view = this;
        this.$el.find("[data-model-set]").each(function(){
        	view.assignModelSetElement(this);
        });
        this.$el.attr("id",this.model.id);
    },
    __update__:function(a,b,c){
        __updateModelView__.call(this,this.model.changedAttributes());
    },
    remove: function(){
        if (!this.model.collection){
            delete __syncNames__[this.__syncName__];
        }
        m.View.prototype.remove.call(this);
    },
    destroy: function(){
        return this.model.destroy();
    },
    save: function(){
        var view = this;
        this.$el.find("[data-model-set]").each(function(){
            var setter = this.getAttribute("data-model-set");
            if (typeof view["set_"+setter] == "function") view["set_"+setter]($(this).val(),this);
            else view.model.set(setter,$(this).val(),{silent: true});
        });
        return view.model.save();
    },
    fetch: function(){
        return this.model.fetch();
    }
});