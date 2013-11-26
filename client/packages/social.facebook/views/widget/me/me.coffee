m.WidgetView.extend {
  rendered: ->
    FB.api("/me",(r)=>
        @$(".name").text(r.name);
    )

}