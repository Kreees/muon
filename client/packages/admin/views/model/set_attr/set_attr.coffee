m.ModelView.extend {
  postTemplateRender: ->
    tagname = @attr_tag_type || "input"
    el = document.createElement(tagname)
    el.dataset.modelSet = @attr_name
    @$el.html(el.outerHTML)
}