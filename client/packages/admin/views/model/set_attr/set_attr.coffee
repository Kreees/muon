m.ModelView.extend {
  post_template_render: ->
    tagname = @attr_tag_type || "input"
    el = document.createElement(tagname)
    el.dataset.modelSet = @attr_name
    @$el.html(el.outerHTML)
}