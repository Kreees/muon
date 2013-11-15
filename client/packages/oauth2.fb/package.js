module.exports = {
    models: [
        "oauth2.fb"
    ],
    ready: function(next){
        var _this = this;
        window.fbAsyncInit = function(){
            FB.init({
                "channelUrl": location.protocol+"//"+location.host+"apis/MUON:oauth2.fb/?muon&__action__=channelUrl",
                "appId": _this.cfg.appId,
                "status": true,
                "cookie": true,
                "xfbml": true
            });

            FB.Event.subscribe('auth.authResponseChange', function(response) {
                if (response.status === 'connected') m.setProfile("FB_authorized")
                else if (response.status === 'not_authorized') m.setProfile("FB_no_authorized")
                else m.setProfile("FB_no_authorized")
            });
            next();
        }
        $("<script src='//connect.facebook.net/en_US/all.js' />").appendTo(document.body);

    },
    middleware: []
}