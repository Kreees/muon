var crypto = require("crypto");
var Q = require("q");
var _ = require("underscore");

module.exports = m.rest.extend({
    dependencies: ["user.session"],
    decorator: [],
    permissions: function(){
        if (this.user && this.user.id == this.value) return ["all"];
        else return ["create","index"];
    },
    actions: {
        create: function(req){
            var dfd = Q.defer();
            var _this = this;
            var args = arguments;
            this.model.db.find({nick:req.body.nick}).then(function(a){
                console.log(a);
                if (a.length > 0)
                    return dfd.reject({error: "User with such Nick already exists",statusCode: 1})
                var md5 = crypto.createHash("md5");
                req.body.password = md5.update(req.body.password).digest("hex");
                m.rest.actions.create.apply(_this,args).then(dfd.resolve,dfd.reject);
            })

            return dfd.promise;
        },
        edit: function(req,res,id){
            var dfd = Q.defer();
            this.model.objects.get(id).then(
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