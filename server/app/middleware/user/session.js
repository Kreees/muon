function find_session(req,res,next){
    var _this = this;
    this.model.db.find({"session_id":req.cookies["muon.session.id"]}).then(function(a){
        _this.session = a.eval()[0];
        if (_this.session){
            var end = res.end;
            res.end = function(){
                end.apply(res,arguments);
                if (_this.session){
                    _this.session.set("last_viewed",new Date());
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
    this.model.db.find({"expires":{$lt: new Date()}}).then(function(a){
        a.del().then(function(){
            find_session.apply(_this,args)
        });
    });
}

module.exports = function(req,res,next){
    clear_old_sessions.apply(this,arguments)
};