var md5 = require("crypto").createHash("md5");
var Q = require("q");

module.exports = m.rest.extend({
//    permissions: function(){
//
//    },
    actions: {
        create: function(req,res){
            req.body.password = md.update(req.body.password).digest("hex");
            return m.rest.actions.create.apply(this,arguments);
        },
        "edit": function(req,res,id){
            var dfd = Q.defer();
            this.__model__.objects.get(id).then(
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