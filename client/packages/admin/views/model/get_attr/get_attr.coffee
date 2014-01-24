m.ModelView.extend {
  postTemplateRender: ->
    tagname = @attr_tag_type || "span"
    el = document.createElement(tagname)
    el.setAttribute("model-attr",@attr_name)
    @$el.html(el.outerHTML)
}