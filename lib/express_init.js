var app = require("express")(),
    fs = require("fs"),
    cons = require("consolidate"),
    less = require("less"),
    coffee = require("coffee-script");

function less_render(path,opts,callback){
    less.render(fs.readFileSync(path,"utf-8"),callback);
}
function coffee_render(path,opts,callback){
    try { callback(null,coffee.compile(fs.readFileSync(path,"utf-8"))); }
    catch(e) {callback(e,"");}
}

for(var i in cons){
    if (i == "clearCache") continue;
    else app.engine(i,cons[i]);
}
app.engine("html",require('ejs').renderFile);
app.engine("jade",require('jade').__express);
app.engine("less",less_render);
app.engine("coffee",coffee_render);
app.engine("css",less_render);

module.exports = app;