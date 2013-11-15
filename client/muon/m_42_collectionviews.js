function __setEmptyFlag__(){
    if (this.collection.length == 0) this.$el.addClass("empty-collection").removeClass("non-empty-collection");
    else this.$el.removeClass("empty-collection").addClass("non-empty-collection");
}

function __addToCollection__(obj){
    __setEmptyFlag__.call(this);
    var model = obj;
    if (this.target.children("#"+model.id).length == 0){
        var $modelView = new this.modelView(model);
        var after = this.target.children()[this.collection.models.indexOf(model)+this.__keepChildrenLength__];
        if (after) $modelView.$el.before(after);
        else this.target.append($modelView.$el);
        this.childModels[model.id] = $modelView;
    }
}

function __removeFromCollection__(obj){
    __setEmptyFlag__.call(this);
    if (obj.id in this.childModels)
        this.childModels[obj.id].remove();
}

function __updateCollection__(collection){
    __setEmptyFlag__.call(this);
    if (collection != this.context) return;
    var _ = this;
    if (!this.modelView){
        throw Error("No model view specified");
    }
    var inCollection = [];
    for(var i in collection.models){
        var model = collection.models[i];
        inCollection.push("#"+model.id);
    }
    var toRemove = this.target.children().not(inCollection.join(", "));
    this.__keepChildren__.each(function(){
        toRemove = toRemove.not(this);
    });
    toRemove.each(function(){
        _.childModels[$(this).attr("id")].remove();
        delete _.childModels[$(this).attr("id")];
    });
    var $modelView = null;
    for(var i in collection.models)
    {
        var model = collection.models[i];
        if (this.target.children("#"+model.id).length == 0){
            var before = this.target.children()[i+this.__keepChildrenLength__];
            $modelView = new this.modelView(model);
            if (before) $modelView.$el.insertBefore(before);
            else this.target.append($modelView.$el);
            this.childModels[model.id] = $modelView;
        }
    }
}

function __sorted__(collection){
    for(var i = 0; i < collection.length; i++){
        var model = collection.models[i];
        this.target.append(this.childModels[model.id].$el);
    }
}

m.CollectionView = m.View.extend({
    viewType: "collection",
    initialize: function(collection){
        this.collection = collection;
        this.childModels = {};
        if (!this.modelView) this.modelView = this.template;
        if (_.isString(this.modelView)) this.modelView = __getViewNameByType__("model",this.modelView,collection.modelName,this.package);

        if (!this.modelView) throw Error("ModelView for collection view is not defined: "+this.template);
        this.listenTo(collection,"sync",__updateCollection__.bind(this));
        this.listenTo(collection,"add",__addToCollection__.bind(this));
        this.listenTo(collection,"remove",__removeFromCollection__.bind(this));
        this.listenTo(collection,"sort",__sorted__.bind(this));
        m.View.prototype.initialize.apply(this,arguments);
    },
    remove: function(){
        if (!this.collection.keep) delete __syncNames__[this.collection.__syncName__];
        delete this.collection;
        m.View.prototype.remove.call(this);
    },
    __set__:function(){
        this.target = this.target?this.$("#"+this.target):this.$el;
        this.__keepChildren__ = this.target.children();
        this.__keepChildrenLength__ = this.__keepChildren__.length;
        __updateCollection__.call(this,this.collection);
    }
});
