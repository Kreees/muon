var MuonORMPlugin = function(){
    function wrapHook(hooks, hookName, postLogic) {
        if(typeof hooks[hookName] == 'function') {
            var oldHook = hooks[hookName];
            hooks[hookName] = function(next) {
                var cont = function() {
                    postLogic.call(this);
                    next();
                }

                var that = this;
                oldHook.call(this, function() {
                    cont.call(that);
                });

                if(oldHook.length == 0) cont.call(this);
            };
        } else {
            hooks[hookName] = postLogic;
        }
    }

    return {
        beforeDefine: function(name,attrs,opts){
            opts.timestamp = true
            opts.hooks = opts.hooks || {};
            wrapHook(opts.hooks,"afterLoad",function(){
                this.__modelName__ = opts.modelName;
                this.__fullName__ = opts.fullName;
                this.__pluginName__ = opts.pluginName;
            });
        }
    }
};

module.exports = function(){

}