module.exports = {
    models: [
        "oauth2.fb"
    ],
    ready: function(next){
        var _this = this;
        this.authResponse = null;
        window.fbAsyncInit = function(){
            FB.init({
                "channelUrl": location.protocol+"//"+location.host+"apis/MUON:social.facebook/?muon&__action__=channelUrl",
                "appId": _this.cfg.appId,
                "status": true,
                "cookie": true,
                "xfbml": true
            });

            FB.Event.subscribe('auth.authResponseChange', function(r) {
                if (r.status === 'connected'){
                    _this.authResponse = r.authResponse;
                    _this.userAuthorized();
                }
                else _this.userNotAuthorized();
            });
            FB.getLoginStatus(function(r){
                if (r.status == "connected"){
                    _this.authResponse = r.authResponse;
                    _this.userAuthorized();
                }
                else _this.userNotAuthorized();
                next();
            });
        }
        $("<script src='//connect.facebook.net/en_US/all.js' />").appendTo(document.body);
    },
    middleware: [],
    surrogate: {
        userAuthorized: function(){
            if (m.hasProfile("FB_authorized")) return;
            m.removeProfile("FB_not_authorized");
            m.setProfile("FB_authorized");
            localStorage["FB_authorized"] = true;
        },
        userNotAuthorized: function(){
            if (m.hasProfile("FB_not_authorized")) return;
            m.removeProfile("FB_authorized");
            m.setProfile("FB_not_authorized");
            localStorage["FB_authorized"] = false;
        }
    }
}