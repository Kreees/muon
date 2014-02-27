module.exports = m.super.extend({
//    dependencies: ["session"],
    permissions: ["index"],
    actions: {
        index: function(req, res){
            var dfd = m.utils.Q.defer();

            this.model.find({sex:false},function(e,a){
                dfd.resolve(a)
            })

            return dfd.promise;
        }
    }
})
