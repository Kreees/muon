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
        dfd.resolve('/pack_src/MUON:admin/mystery-man.jpg?muon')
      );
      return @dfd.promise();
}