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
    }).then();
  error: ->
}