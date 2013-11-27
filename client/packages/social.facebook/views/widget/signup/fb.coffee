m.WidgetView.extend {
  init: ->
    FB.api "me",(r)=>
      return if r.error
      @$(".user_name").text(r.name)
  events: {
    "click button": "try_login"
  }
  "try_login": ->
    FB.getLoginStatus((r)=>
      if r.status == "connected"
        @trigger("connected",r.authResponse)
      else
        FB.login((r)=>
          if r.status == "connected"
            _this.trigger("connected",r.authResponse)
        ,{
          scope: _this.surrogate().scope || ""
        })
    )
}