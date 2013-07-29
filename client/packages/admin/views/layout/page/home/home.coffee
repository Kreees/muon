muon.PageLayoutView.extend {
  rendered: ->
#    $.ajax("/docs").then((ret)=>
#      ((file,arr)=>
#        console.log(file,arr);
#        $("#files",@$el).append($("<p />").text(obj.file).click(=>
#          $("#context",@$el).html("")
#
#          data = JSON.stringify(obj.data,null,3);
#          $("#context",@$el).append($("<pre class='prettyprint linenums lang-js' />").text(data))
#
#
##          data = data.replace(/\/\*\*[\s\S]+?\*\//g,"")
##          data = data.replace(/\n{2,}/,"\n")
#
#
#          setTimeout(->
#            PR.prettyPrint()
#          ,0)
#        ))
#      )(i,j) for i,j in ret
#    )
}