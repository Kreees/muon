module.exports = function(self,deps){
    var express = require("express"),
        fs = require("fs"),
        cons = require("consolidate"),
        less = require("less"),
        coffee = require("coffee-script"),
        lessPrepare = deps.utils.lessPrepare;

    function lessRender(path,_,callback){
        less.render(lessPrepare(fs.readFileSync(path,"utf-8")),callback);
    }

    function coffeeRender(path,opts,callback){
        try { callback(null,coffee.compile(fs.readFileSync(path,"utf-8"))); }
        catch(e) {callback(e,"");}
    }

    function initApp(app){
        for(var i in cons){
            if (i == "clearCache") continue;
            else app.engine(i,cons[i]);
        }
        app.engine("html",require('ejs').renderFile);
        app.engine("jade",require('jade').__express);
        app.engine("less",lessRender);
        app.engine("coffee",coffeeRender);
        app.engine("css",coffeeRender);
        return app;
    }

    return {
        newApp: function(){
            var app = express();
            return initApp(app);
        }
    }
}