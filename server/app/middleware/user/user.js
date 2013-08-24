module.exports = function(req,res,next){
    var _this = this;
    if (!this.session) return next();
    this.m.models["user.user"].db.find({_id: this.session.get("user")}).then(function(a){
        _this.user = a.eval()[0];
        if (_this.$model == _this.m.models["user.user"])
            _this.$decorator = ["email","nick","roles"]
        if (!_this.user){
            _this.session.del();
            delete _this.session;
        }
        next();
    });
}