var md5 = require("crypto").createHash("md5"),
    Q = require("q"),
    _ = require("underscore");

module.exports = {
    permissions: ["create","delete"],
    actions: {
        "create": function(req,res){
            var dfd = Q.defer();
            var _this = this;
            if (req.body.session_id){
                _this.m.models["user.session"].db.find({"session_id":req.body.session_id})
                    .then(dfd.resolve,dfd.reject);
            }
            else {
                _this.m.models["user.user"].db.find({$or: [
                    {nick: req.body.login, password: req.body.password},
                    {email: req.body.login, password: req.body.password}
                ]}).then(function(obj){
                        if (obj.length == 0) dfd.reject({message: "Wrong user or password"});
                        else if (obj.length > 1){
                            console.log("Error: You have to many users in database with this credentials!")
                            dfd.reject({message: "Too many users with this credentials!"});
                        }
                        else {
                            new _this.m.models["user.session"]({
                                "user": obj[0],
                                "created": new Date(),
                                "last_view": new Date(),
                                "session_id": md5.update(obj[0]+new Date().toISOString()).digest("hex"),
                                "expires": req.body.remember?new Date(Date.now() + 1000*3600*24*365*10):new Date(Date.now() + 1000*3600*6)
                            }).save().then(function(a){
                                    res.cookie(
                                        "muon.session.id",
                                        a.get("session_id"),
                                        req.body.remember?{expires: new Date(Date.now() + 1000000000000)}:{});
                                    dfd.resolve(a)
                                },dfd.reject);
                        }
                    });
            }
            return dfd.promise;
        },
        "delete": function(){
            return;
        }
    }
};