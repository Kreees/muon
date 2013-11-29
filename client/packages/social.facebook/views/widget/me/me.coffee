m.WidgetView.extend {
  rendered: ->
    @$("img").attr("src","https://graph.facebook.com/me/picture?access_token="+@surrogate().authResponse.accessToken)
    FB.api("/me",(r)=>
        @$(".name").text(r.name);
    )

}