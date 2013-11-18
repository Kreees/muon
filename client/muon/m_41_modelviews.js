function __setGetElementValue__(view,getter){
    function set(val){
        if (!this.dataset["attrType"]){
            if (this.tagName == "INPUT" || this.tagName == "SELECT") $(this).val(val);
            else this.innerText = val;
        }
        else if (this.dataset["attrType"] == "text") this.innerText = val;
        else if (this.dataset["attrType"] == "html") this.innerHTML = val;
        else $(this).attr(this.dataset["attrType"],val);
    }
    if (typeof view["get_"+getter] == "function"){
        var val = view["get_"+getter]();
        console.log(this);
        if (typeof val == "object" && "then" in val) val.then(set.bind(this));
        else set.call(this,val);
    }
    else set.call(this,view.model.get(getter));
}

function __updateModelView__(attrs){
    var _this = this;
    if (this.$el.find("[data-model-attr]").length != 0){
        for(var i in attrs){
            var $subElement = this.$el.find("[data-model-attr^='"+i+"']");
            if (!$subElement.length) continue;
            $subElement.each(function(){
                var attrsList = this.dataset["modelAttr"].split(".");
                var attrValue = attrs[attrsList.shift()];
                try {
                    while(attrsList.length != 0){
                        attrValue = attrValue[attrsList.shift()];
                    }
                }
                catch(e){
                    attrValue = attrValue.toString();
                }
                if (!this.dataset["attrType"]) this.innerText = attrValue;
                else if (this.dataset["attrType"] == "text") this.innerText = attrValue;
                else if (this.dataset["attrType"] == "html") this.innerHTML = attrValue;
                else $(this).attr(this.dataset["attrType"],attrValue);
            });
        }
    }
    this.$el.find("[data-model-get],[data-model-set]").each(function(){
        __setGetElementValue__.call(this,_this,this.dataset.modelGet || this.dataset.modelSet);
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
    __set__: function(){
        __updateModelView__.call(this,this.model.attributes);
        var view = this;
        this.$el.find("[data-model-set]").each(function(){
            var setter = this.dataset.modelSet;
            var _this = this;
            var int = null;
            view.listenTo(view.model,"sync",function(){
                __setGetElementValue__.call(_this,view,setter);
            });
            if (!(this.dataset.silent || view.silent)){
                $(this).keyup(function(){
                    clearTimeout(int);
                    int = setTimeout(function(){$(_this).trigger("change");},150);
                });
                $(this).change(function(){
                    if (typeof view["set_"+setter] == "function") view["set_"+setter]($(this).val());
                    else view.model.set(setter,$(this).val());
                });
            }
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
            var setter = this.dataset.modelSet;
            if (typeof view["set_"+setter] == "function") view["set_"+setter]($(this).val());
            else view.model.set(setter,$(this).val(),{silent: true});
        });
        return view.model.save();
    },
    fetch: function(){
        return this.model.fetch();
    }
});