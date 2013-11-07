m.CollectionView = m.View.extend({
    /**
     *  Атрибут определяет категорию
     *
     *  @attribute
     *  @name muon.viewType
     *  @private
     */
    viewType: "collection",
    /**
     * @constructor
     */
    initialize: function(collection){
        this.collection = collection;
        this.childModels = {};
        if (!this.modelView) this.modelView = this.template;
        if (_.isString(this.modelView)) this.modelView = m.getViewNameByType("model",this.modelView,collection.modelName,this.package);

        if (!this.modelView) throw Error("ModelView for collection view is not defined: "+this.template);
        this.listenTo(collection,"sync",this.__updateCollection__);
        this.listenTo(collection,"add",this.__addToCollection__);
        this.listenTo(collection,"remove",this.__removeFromCollection__);
        this.listenTo(collection,"sort",this.__sorted__);
        m.View.prototype.initialize.apply(this,arguments);
    },
    /**
     * Redefines basic muon.View 'remove' method
     *
     *
     */
    remove: function(){
        if (!this.collection.keep) delete __syncNames__[this.collection.__syncName__];
        delete this.collection;
        m.View.prototype.remove.call(this);
    },
    /**
     * Executes CollectionView specific context on view mapping
     *
     * @method
     * @name __set__
     * @private true
     */
    __set__:function(){
        this.target = this.target?this.$("#"+this.target):this.$el;
        this.__keepChildren__ = this.target.children();
        this.__keepChildrenLength__ = this.__keepChildren__.length;
        this.__updateCollection__(this.collection);
    },
    /**
     * Checks whether collection is empty or not and sets corresponding DOM class to view DOM element (this.el)
     *
     * @method
     * @name __setEmptyFlag__
     * @private
     */
    __setEmptyFlag__: function(){
        if (this.collection.length == 0) this.$el.addClass("empty-collection").removeClass("non-empty-collection");
        else this.$el.removeClass("empty-collection").addClass("non-empty-collection");
    },
    /**
     * Private method that adds new ModelView to CollectionView as a reaction on "add" collection event.
     *
     * @method
     * @private true
     * @name  __addToCollection__
     * @class CollectionView
     * @param {Object} obj as;ldkfj;alskjdf;la
     * @param {Object} second asdf asdf
     * @private
     * @return {muon.CollectionView|null} asdfasdfklasfd
     */
    __addToCollection__: function(obj){
        this.__setEmptyFlag__();
        var model = obj;
        if (this.target.children("#"+model.id).length == 0){
            var $modelView = new this.modelView(model);
            var after = this.target.children()[this.collection.models.indexOf(model)+this.__keepChildrenLength__];
            if (after)
                $modelView.$el.before(after);
            else
                this.target.append($modelView.$el);

            this.childModels[model.id] = $modelView;
        }
    },
    /**
     *
     * @param obj
     */
    __removeFromCollection__: function(obj){
        this.__setEmptyFlag__();
        if (obj.id in this.childModels)
            this.childModels[obj.id].remove();
    },
    /**
     *
     * @param {muon.Collection} collection
     */
    __updateCollection__: function(collection){
        this.__setEmptyFlag__();
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
    },
    /**
     * Triggers each time when collection __sorted__
     * @method
     * @param {muon.Collection} collection
     */
    __sorted__: function(collection){
        for(var i = 0; i < collection.length; i++){
            var model = collection.models[i];
            this.target.append(this.childModels[model.id].$el);
        }
    }
});
