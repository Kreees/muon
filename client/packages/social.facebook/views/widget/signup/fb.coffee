m.WidgetView.extend {
  events: {
    "click button": "try_login"
  }
  "try_login": ->
    FB.login((r)=>
      if r.status == "connected"
        @trigger("connected",r.authReponse)
    ,{
      scope: @surrogate().scope || ""
    })
}