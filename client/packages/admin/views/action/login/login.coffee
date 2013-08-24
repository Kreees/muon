m.ActionView.extend {
  events: {
    "click button#login": "login"
  }
  login: (ev)->
    ev.preventDefault();
    window.some = this;
    new @m.models["user.session"]().save({
      login: @$("#login").val()
      password: md5(@$("#pass").val())
      remember: @$("#remember")[0].checked
    }).then(=>
      this.m.set_projection("admin.logined",new @m.models["user.user"]("me",{force_sync:true}));
      m.set_profile("logined");
    ,@error.bind(this));
  error: (e)->
    console.log(e);
}