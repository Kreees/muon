m.WidgetView.extend {
  events: {
    "click button#login": "login"
  }
  login: (ev)->
    ev.preventDefault();
    new @m.models["user.session"]().save({
      login: @$("#login").val()
      password: md5(@$("#pass").val())
      remember: @$("#remember")[0].checked
    }).then(=>
      _this.m.models["user.user"].get("me").then((me)->
        _this.m.setProjection("admin.logined",me);
      );
      m.setProfile("logined");
    ,@error.bind(this));
  error: (e)->
    @$(".alert.error-msg").text(e[1].responseJSON.error.message);
}