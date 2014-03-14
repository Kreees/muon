module.exports = m.ResourceController.extend({
    permissions: ["index", 'get', 'create', 'edit', 'remove', 'permitted'],
    actions: {
        index: function(req, res){
            var dfd = m.utils.Q.defer();

            this.model.find({},function(e,a){
                dfd.resolve(a)
            })

            return dfd.promise;
        },
        permitted: function(req,res){
            return {};
        },
        forbidden: function(req, res){
            return {};
        }
    }
})
