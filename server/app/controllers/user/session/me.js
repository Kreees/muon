module.exports = {
    actions: {
        permissions: function(){
            if (this.session) return ["all"];
            else return [];
        },
        get: function(){
            return this.session || null;
        },
        delete: function(req,res){
            var id = this.session.id;
            delete this.session;
            return m.rest.actions.delete.apply(this,[req,res,id]);
        }
    }
}