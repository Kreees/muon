module.exports = {
    actions: {
        get: function(req, res){
            var dfd = m.utils.Q.defer();
            this.model.one(function(e,a){
                dfd.resolve(a)
            })
            return dfd.promise;
        }
    }
}