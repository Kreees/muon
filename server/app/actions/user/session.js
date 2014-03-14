var crypto = require("crypto");
    Q = require("q"),
    _ = require("underscore");

module.exports = {
    permissions: function(){
        if (this.session && this.session.id == this.value) return ["remove"]
        else return ["create"];
    },
    actions: {
        "create": function(req,res){
            var md5 = crypto.createHash("md5");
            var dfd = Q.defer();
            var _this = this;
            _this.m.models["user.user"].db.find({$or: [
                {nick: _this.data.login, password: _this.data.password},
                {email: _this.data.login, password: _this.data.password}
            ]}).then(function(obj){
                if (obj.length == 0) dfd.reject([404,{message: "Wrong user or password"}]);
                else if (obj.length > 1){
                    console.log("Error: You have to many users in database with this credentials!")
                    dfd.reject({message: "Too many users with this credentials!"});
                }
                else {
                    try{
                        new _this.model({
                            "user": obj[0],
                            "created": new Date(),
                            "last_view": new Date(),
                            "session_id": md5.update(obj[0]+new Date().toISOString()).digest("hex"),
                            "expires": req.body.remember?new Date(Date.now() + 1000*3600*24*365*10):new Date(Date.now() + 1000*3600*6)
                        }).save().then(function(a){
                            res.cookie(
                                _this.cookieName,
                                a.get("session_id"),
                                req.body.remember?{expires: new Date(Date.now() + 1000000000000)}:{});
                            dfd.resolve(a)
                        },dfd.reject);
                    }
                    catch(e){
                        m.log(e.message);
                    }
                }
            }).done();
            return dfd.promise;
        },
        "remove": m.ResourceController.actions.remove
    }
};