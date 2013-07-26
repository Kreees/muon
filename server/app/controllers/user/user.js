var md5 = require("crypto").createHash("md5");
var Q = require("q");
var _ = require("underscore");

module.exports = m.rest.extend({
    decorator: [],
    permissions: ["create","index"],
    actions: {
        create: function(req,res){
            req.body.password = md5.update(req.body.password).digest("hex");
            return m.rest.actions.create.apply(this,arguments);
        },
        "edit": function(req,res,id){
            var dfd = Q.defer();
            this.$model.objects.get(id).then(
                function(a){
                    a.set(req.body);
                    a.save().then(dfd.resolve,dfd.reject);
                },
                dfd.reject
            );
            return dfd.promise;
        }
    }
})