module.exports = {
    actions: {
        get: function(){
            return this.session || null;
        }
    }
}