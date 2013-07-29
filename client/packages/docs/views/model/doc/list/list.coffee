m.ModelView.extend {
  get_url: ()->
    name = this.model.get("name")
    type = this.model.get("type")
    if name? and type?
      return "/"+type+"/"+name
    else
      return null
  get_in_file_url: ()->
    if this.model.get("file_name")
      return "/file/"+this.model.get("file_name")+"/"+this.model.get("line")
    else
      return null
}