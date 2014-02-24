function findSession(req,res,next){
    var _this = this;
    this.model.find({"session_id":req.cookies[this.cookieName]}).run(function(e,a){
        _this.session = a[0];
        if (_this.session){
            var end = res.end;
            res.end = function(){
                end.apply(res,arguments);
                if (_this.session){
                    _this.session.last_viewed = new Date();
                    _this.session.save();
                }
            }
        }
        next();
    });
}

function clear_old_sessions(req,res,next){
    var args = arguments;
    var _this = this;
    this.model.find({"expires":m.utils.orm.lt(new Date())}).remove(function(e){
        if (e) m.error(e,true);
        else findSession.apply(_this,args);
    });
}

module.exports = function(req,res,next){
    this.cookieName = "session_id_"+this.model.modelName;
    clear_old_sessions.apply(this,arguments)
};