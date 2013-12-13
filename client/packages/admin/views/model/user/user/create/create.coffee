m.ModelView.extend {
  events: {
    "click #create": "create"
    "keyup input": "check"
  }
  rendered: ->
    @button = @$("button")
    @nick = @$("#nick")
    @email = @$("#email")
    @pass = @$("#pass")
    @repass = @$("#repass")
    @$("input").tooltip({placement: "right"})
  "create": (ev)->
    ev.preventDefault()
    return if @button.hasClass("disabled")
    a = @model
    a.save({
      nick: @nick.val()
      email: @email.val()
      password: @pass.val()
    }).then(=>
      window.some = this;
      m.removeProfile("first_user")
      new @m.model_user_session().save({login:@email.val(),password:md5(@pass.val())}).then( ->
        m.set_profile("logined")
      )
    )
  "check": ->
    clearTimeout(@check_int)
    @check_int = setTimeout(=>
      flag = true
      if /^[a-zA-Z0-9_\.]+@[a-zA-Z0-9_\.]+\.[a-zA-Z]{2,5}$/.test(@email.val())
        @email.next().hide()
        @email.parent().parent().removeClass("error")
      else
        if @email.val()
          @email.next().show()
          @email.parent().parent().addClass("error")
        flag = false

      if /^\S{6,100}$/.test(@pass.val())
        @pass.next().hide()
        @pass.parent().parent().removeClass("error")
      else
        if @pass.val()
          @pass.next().show()
          @pass.parent().parent().addClass("error")
        flag = false

      if @pass.val() == @repass.val()
        @repass.next().hide()
        @repass.parent().parent().removeClass("error")
      else
        if @pass.val()
          @repass.next().show()
          @repass.parent().parent().addClass("error")
        flag = false

      if flag
        @$("button").removeClass("disabled")
      else
        @$("button").addClass("disabled")
    ,300)

}