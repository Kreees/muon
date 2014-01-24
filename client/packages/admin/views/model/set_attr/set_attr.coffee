m.ModelView.extend {
  postTemplateRender: ->
    tagname = @attr_tag_type || "input"
    el = document.createElement(tagname)
    el.setAttribute("data-model-set",@attr_name)
    @$el.html(el.outerHTML)
}