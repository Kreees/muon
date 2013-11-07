m.LayoutView = m.View.extend({
    viewType: "layout",
    initialize:function(blocks){
        this.blocks = blocks || {};
        m.View.prototype.initialize.apply(this,arguments);
    },
    __set__:function(){
        for(var i in this.blocks){
            var block = this.blocks[i];
            this.$el.find("#"+i).html("");
            this.$el.find("#"+i).append(block.$el);
        }
    },
    __reset__: function(){
        for(var i in this.blocks){
            var block = this.blocks[i];
            block.reload();
            this.$("#"+i).html("");
            this.$("#"+i).append(block.$el);
        }
    },
    get: function(alias){
        if (alias in this.blocks)
            return this.blocks[alias];
        else
            throw new Error("View is not in layout.");
    },
    removeView: function(id){
        if (id in this.blocks){
            this.$("#"+id).html("");
            this.blocks[id].remove();
            delete this.blocks[id];
        }
    },
    update:function(blocks){
        var prevBlock = this.blocks || {};
        for(var i in blocks){
            var block = blocks[i];
            if (i in prevBlock) {
                prevBlock[i].remove();
            }
            this.blocks[i] = blocks[i];
            this.$("#"+i).html("");
            this.$("#"+i).append(block.$el);
        }
        return this;
    },
    remove: function(){
        for(var i in this.blocks){
            if (this.blocks[i]) this.blocks[i].remove();
        }
        m.View.prototype.remove.call(this);
    }
});

m.PageLayoutView = m.LayoutView.extend({
    __set__: function(){
        if (this.context instanceof m.ApplicationStackView){
            this.$el.append(this.context.$el);
        }
        m.LayoutView.prototype.__set__.call(this);
    }
});