m.ModelView.extend {
  post_template_render: ->
    tagname = @attr_tag_type || "span"
    el = document.createElement(tagname)
    el.dataset.modelAttr = @attr_name
    @$el.html(el.outerHTML)
}