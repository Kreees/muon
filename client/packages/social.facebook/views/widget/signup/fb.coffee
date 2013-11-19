m.WidgetView.extend {
  rendered: ->
    alert(1)
    FB.getLoginStatus (r)=>
      if r.status == "connected"
        alert("connected")
        @trigger("connected",r.authReponse)
      else console.log("Not connected");
  events: {
    "click button": "try"
  }

  "try": ->
    window.a = this;
    FB.login((r)=>
      if r.status == "connected"
        @trigger("connected",r.authReponse)
      else
        console.log("Not connected");
    ,{
      scope: @surrogate().scope || ""
    })
  rendered: ->

}