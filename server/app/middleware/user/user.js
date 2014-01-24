module.exports = function(req,res,next){
    var _this = this;
    if (!this.session) return next();
    this.model.get(this.session.user).run(function(e,user){
        _this.user = user;
        if (!_this.user){
            _this.session.remove();
            delete _this.session;
        }
        next();
    });
}