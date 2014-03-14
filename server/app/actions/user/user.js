var crypto = require("crypto");
var Q = require("q");
var _ = require("underscore");

module.exports = m.ResourceController.extend({
    dependencies: ["user.session"],
    permissions: function(){
        if (this.user && this.user.id == this.value) return ["all"];
        var dfd = Q.defer();
        this.model.count(function(e,len){
            if (len == 0) dfd.resolve(["create","index"]);
            else dfd.resolve(["index"]);
        });
        return dfd.promise;
    },
    actions: {
        create: function(req){
            var dfd = Q.defer();
            var _this = this;
            var args = arguments;

            this.data.password = this.data.password || "";

            this.model.find({nick:this.data.nick},function(e,a){
                if (a.length > 0)
                    return dfd.reject([409,{error: "User with such Nick already exists"}]);
                var md5 = crypto.createHash("md5");
                _this.data.password = md5.update(_this.data.password).digest("hex");
                m.ResourceController.actions.create.apply(_this,args).then(dfd.resolve,dfd.reject);
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
});