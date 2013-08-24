

verify_list = {}
attention_list = {}

m.ModelView.extend {
  silent: true
  rendered: ->
    $("input").tooltip({placement: "right"})
  events: {
    "change input,select": "verify"
    "click form button": "prevent"
    "click form button#revert": "fetch"
    "click form button#save": "save"
  }
  attention: (ev)->
    el = ev.currentTarget
    $el = $(el)
    if attention_list[el.dataset.modelSet]
      $el.next(".help-inline").text(attention_list[el.dataset.modelSet]($el.val()))
  verify: (ev)->
    @attention(ev)
  prevent: (ev)->
    ev.preventDefault()
}