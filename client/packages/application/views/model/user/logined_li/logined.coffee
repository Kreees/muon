m.ModelView.extend {
  tag_name: "li",
  class_name: "dropdown"
  get_avatar: ->
    dfd = $.Deferred()
    md5email = md5(@model.get("email").toLowerCase())
    $.ajax({
      url: "http://gravatar.com/"+md5email+".json",
      dataType:"jsonp",
      cache: true
    }).then(=>
        dfd.resolve("http://gravatar.com/avatar/"+md5email)
      ,=>
        dfd.resolve("/img/mystery-man.jpg");
      )
    dfd.promise()
}