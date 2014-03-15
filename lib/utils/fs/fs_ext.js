var fs = require("fs");
var _ = require("underscore");

function findPatterns(str,patternArray){
    str = str || "";
    patternArray = patternArray || [];
    if (patternArray.length == 0) return false;
    for(var i in patternArray){
        if(str.match(patternArray[i]) !== null) return true;
    }
    return false;
}

function traverseDir(path,__call__,compl,ignore,filter,__counter__){
    var __compl__ = _.once(function(){
        if (!isFinite(__counter__) && typeof compl == "function") compl();
    });
    var counter = __counter__ || 0;
    path = path.replace(/\/$/,"");
    ignore = ignore || []; filter = filter || [];
    try {var dir = fs.readdirSync(path);}
    catch(e){return __compl__ && __compl__();}
    counter += dir.length;
    if (counter == 0) return __compl__();
    for(var i in dir){
        if (findPatterns(path+dir[i],ignore) || dir[i].replace(/^(temp_[\s\S]*)|(\.+[\s\S]*)|([\s\S]*~)|([\s\S]*\.back)$/,"wrong")=="wrong")
        {
            counter--;
            if (counter == 0) return __compl__();
            continue;
        }
        var fileName = path+"/"+dir[i];
        var stat = fs.statSync(fileName);
        counter--;
        if (stat.isFile()){
            if (filter.length == 0 || findPatterns(fileName.substring(fileName.lastIndexOf("/")),filter)){
                __call__(fileName.replace(/\/+/g,"/"),stat);
            }
        }
        else traverseDir(fileName,__call__,compl,ignore,filter,counter);
        if (counter == 0) return __compl__ && __compl__();
    }
};

module.exports = {
    tree: function(path,callback,ignore,filter){
        var ret = [];
        traverseDir(path,function(name){ret.push(name)},function(){
            callback(_.sortBy(ret,function(name){return name}));
        },ignore,filter);
    },
    traverseDir: traverseDir
}