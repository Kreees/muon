m.StackView = m.View.extend({
    viewType: "stack",
    initialize: function(){
        this.views = {};
        m.View.prototype.initialize.apply(this,arguments);
    },
    __set__:function(){
        if (this.target) this.$target = this.$("#"+this.target);
        else this.$target = this.$el;
        this.$target.addClass('');
        for(var i in this.views){
            this.$target.append(this.views[i].$el);
            if (this.current == i) this.views[i].trigger("viewShown");
        }
    },
    __unset__: function(){
        this.$target.html('');
    },
    add: function(alias,view){
        if (alias instanceof m.View){
            view = alias;
            alias = view.template;
        }
        if (!(view instanceof m.View)) throw Error(View.toString()+" is not proper View object");
        this.views[alias] = view;
        this.listenTo(view,"removed",function(){
            delete this.views[alias];
        });
        view.$el.hide();
        this.$target.append(view.$el);
    },
    removeView: function(id){
        if (id in this.views){
            this.$("#"+id).html("");
            this.views[id].remove();
            delete this.views[id];
        }
    },
    remove: function(){
        for(var i in this.views){
            if (this.views[i] instanceof m.View) this.views[i].remove();
        }
        m.View.prototype.remove.call(this);
    },
    get: function(name){
        if (name in this.views)
            return this.views[name];
        else
        if(this instanceof m.ApplicationStackView) throw Error("Page is not application view: "+name);
        else throw new Error("View is not in this stacked view: "+name);
    },
    show: function(name){
        var _this = this;
        if (this.current == name) return;
        if (!(name in this.views)){
            if(this instanceof m.ApplicationStackView) throw Error("Page is not in application view: "+name);
            else throw Error("View is not in this stacked view: "+name);
        }

        this.previous = _this.current;
        this.current = name;
        function _hide(){
            var i = _this.previous;
            if ('function' == typeof _this.hideAction) _this.hideAction(_this.views[_this.previous],_this.views[name],_show);
            else{
                _this.views[i].$el.hide();
                _show();
            }
        }

        function _show(){
            var i = name;
            if ('function' == typeof _this.showAction) _this.showAction(_this.views[_this.previous],_this.views[name],_proceed);
            else {
                _this.views[i].$el.show();
                _proceed();
            }
        }
        function _proceed(){
            _this.views[name].viewShown && _this.views[name].viewShown()
            _this.views[name].trigger("viewShown");
            if ('function' == typeof _this.postShow) _this.postShow();
        }
        this.beforeShow && this.beforeShow();
        if (_this.previous != undefined && _this.previous != null){
            _this.views[name].viewHidden && _this.views[name].viewHidden()
            _this.views[_this.previous].trigger("viewHidden");
            _hide();
        }
        else _show();
    }
});
/**
 * Класс преставления приложения
 *
 * @name ApplicationStackView
 * @namespace muon
 */

m.ApplicationStackView = m.StackView.extend({
    template: "application",
    __set__:function(){
        /**
         * Если ранее __applicationView__ не был задан значит это самый первый созданный ApplicationStackView объект
         */
        if (!(__applicationView__ instanceof m.ApplicationStackView))
            __applicationView__ = this;
        m.StackView.prototype.__set__.apply(this);
    },
    get: function(name){
        name += /_page$/.test(name)?"":"_page";
        if (this.views[name] == name){
            var view = new (this.pack().views.layout[name]);
            this.views[name] = view;
            this.$target.append(view.$el);
        }
        return m.StackView.prototype.get.call(this,name);
    },
    show: function(name){
        name += /_page$/.test(name)?"":"_page";
        if (this.views[name] == name){
            var view = new (this.pack().views.layout[name]);
            this.views[name] = view;
            this.$target.append(view.$el);
        }
        m.StackView.prototype.show.call(this,name);
    },
    add: function(alias,view){
        if (!view && typeof alias == "string"){
            alias += /_page$/.test(alias)?"":"_page";
            if (alias in this.pack().views.layout) this.views[alias] = alias;
            else throw Error("Can't add not PageLayoutView instance to ApplicationStackView: "+view.template+"_"+view.viewType);
            return;
        }
        if (!view) view = alias;
        if (!(view instanceof m.PageLayoutView))
            throw Error("Can't add not PageLayoutView instance to ApplicationStackView: "+view.template+"_"+view.viewType);
        if (!view) alias = view.template;
        this.views[alias] = view;
        view.$el.hide();
        this.$target.append(view.$el);
    },
    addPages: function(pages){
        var alreadyIn = [];
        var layouts = this.pack().views.layout;
        for(var i in pages){
            var perPageIn = [];
            var q = pages[i];
            q = q.replace(/\-/g,"\\-");
            q = q.replace(/\*/g,"[a-zA-Z0-9\\-_]*").replace(/\?/g,"[a-zA-Z0-9\\-_]").replace(/\+/g,"[a-zA-Z0-9\\-_]+");
            q = q.replace(/\*/,"*?").replace(/\+/,"+?");
            q = new RegExp("^"+q+"_page$");
            for(var j in layouts){
                if (alreadyIn.indexOf(j) != -1) continue;
                if (j.match(q)){
                    perPageIn.push(j);
                    alreadyIn.push(j);
                    this.add(j);
                }
            }
        }
    }
});