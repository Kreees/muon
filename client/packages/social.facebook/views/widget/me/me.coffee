m.WidgetView.extend {
  rendered: ->
    FB.api("/me",(r)=>
      console.log(r)
      @$("img").attr("src",'https://graph.facebook.com/me/picture?access_token='+@surrogate().cfg.appId)
    )

}