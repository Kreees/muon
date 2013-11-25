m.WidgetView.extend {
  events: {
    "click button": "try"
  }
  try: ->
    FB.login((r)=>
      if r.status == "connected"
        @trigger("connected",r.authReponse)
    ,{
      scope: @surrogate().scope || ""
    })
}