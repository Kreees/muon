m.UserModelView = m.ModelView.extend {
    get_avatar: ->
      return @dfd.promise() if @dfd
      email = @model.get("email");
      if !email
        return
      @dfd = $.Deferred();
      email = md5(email.toLocaleLowerCase());
      $.ajax({url: "http://gravatar.com/"+email+".json",dataType: "jsonp"}).then(=>
        dfd = @dfd
        delete this.dfd
        dfd.resolve('http://gravatar.com/avatar/'+email)
      ,=>
        dfd = @dfd
        delete this.dfd
        dfd.resolve('/img/mystery-man.jpg')
      );
      return @dfd.promise();
}