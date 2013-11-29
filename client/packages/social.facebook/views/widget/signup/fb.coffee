m.WidgetView.extend {
  init: ->
    FB.api "me",(r)=>
      return if r.error
      @$(".user_name").text(r.first_name)
      @$(".avatar").attr("src","https://graph.facebook.com/me/picture?access_token="+@surrogate().authResponse.accessToken)
  events: {
    "click .signup": "try_login",
    "click .logout": "logout",
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
  "logout": ->
      FB.logout()
}