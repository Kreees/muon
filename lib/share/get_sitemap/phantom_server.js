var page = require("webpage").create();
var port = 8001;
page.onError = function(){
    console.error.apply(console,arguments);
}

page.onConsoleMessage = function(msg, lineNum, sourceId) {
    console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
};

page.onUrlChanged = function(){
    var args = [].slice.call(arguments);
    args.unshift("URL Changed: ");
    console.error.apply(console,args);
}

var urls = [];
var passed_urls = [];
var ret_obj = {};

function lookup_url(cb){
    var new_urls = page.evaluate(function(){
       return [].map.call($("a[data-route][href]"),function(a){
           return a.href;
       }).filter(function(href){
           return (href.match(/^\/[a-zA-Z0-9_]+]/) || href.match(RegExp("^http:\/\/"+location.host)));
       });
    });
    for(var i = 0, len = new_urls.length; i < len; i ++)
        if ((urls.indexOf(new_urls[i]) == -1) &&
            (passed_urls.indexOf(new_urls[i]) == -1)) urls.push(new_urls[i]);
    if (urls.length == 0) return cb(ret_obj);
    var url = urls.shift();
    passed_urls.push(url);
    page.evaluate((function(url){ m.router.navigate(url,{}); }),url);
    setTimeout(function(){
        console.log("Visiting page "+url+". Left "+urls.length+" links");
        ret_obj[url] = {
            hash: page.evaluate(function(){return md5(document.body.outerHTML)})
        }
        lookup_url(cb);
    },1000)
}

module.exports = {
    launch:function(serv){
        port = serv.port;
        return function(req,res){
            page.open("http://127.0.0.1:8000/");
            page.onLoadFinished = function(){
                page.injectJs(phantom.libraryPath+"/md5.js");
                setTimeout(function(){
                    lookup_url(function(data){
                        res.write(JSON.stringify(data));
                        res.close();
                    });
                },1000);
            }
        }
    }
};