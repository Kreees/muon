m.ActionView.extend {
  events: {
    "click button#login": "login"
  }
  login: (ev)->
    ev.preventDefault();
    new m.model_user_session().save({
      login: @$("#login").val()
      password: md5(@$("#pass").val())
      remember: @$("#remember")[0].checked
    }).then(->
      m.set_projection("logined_user",new m.model_user_user("me",{force_sync:true}));
      m.set_profile("logined");
    ,@error.bind(this));
  error: (e)->
    console.log(e);
}