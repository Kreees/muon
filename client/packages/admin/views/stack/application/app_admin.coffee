m.ApplicationStackView.extend {
  target: "target"
  events: {
    "click li#logout": "logout"
    "view_shown #target > div": "page_shown"
  }
  className: "container"
  pageShown: (ev)->
    page_class = ev.currentTarget.className.split(/\s+/).filter((a)->
      return /_page_layout$/.test(a)
    )[0]
    @$("[data-page="+page_class+"]").addClass("active").siblings().removeClass("active")
    @$("[data-page="+page_class+"]").parent().prev().filter("li")
      .addClass("active").siblings().removeClass("active")
    @$("[data-page="+page_class+"]").next().filter("ul").find("li").removeClass("active")
  logout: ->
    new this.m.models["user.session"]({_id: "me"}).destroy().then(=>
      m.removeProfile("logined")
    )
}