module.exports = {
    permissions: function(){
        if (this.session) return ["all"];
        else return ["get"];
    },
    actions: {
        get: function(){
            return this.session || null;
        },
        remove: function(req,res){
            var id = this.session.id;
            delete this.session;
            return m.ResourceController.actions.remove.apply(this,[req,res,id]);
        }
    }
}