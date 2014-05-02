var fs = require("fs");
var _ = require("underscore");
var Q = require("q");
var pathModule = require("path");

function findPatterns(str,patternArray){
    str = str || "";
    patternArray = patternArray || [];
    if (patternArray.length == 0) return false;
    for(var i in patternArray) if(str.match(patternArray[i]) !== null) return true;
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
        var fileName = pathModule.normalize(path+"/"+dir[i]);
        if (findPatterns(fileName,ignore) || dir[i].match(/^(temp_[\s\S]*)|(\.+[\s\S]*)|([\s\S]*~)|([\s\S]*\.back)$/,"wrong")=="wrong")
            if (--counter == 0) return __compl__();
            else continue;

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

function tree(path,callback,ignore,filter){
    if (!_.isArray(path)) path = [path];
    path = path.slice();
    var ret = [];
    (function call(){
        if (path.length == 0) return callback(_.sortBy(ret,function(name){return name}));
        var p = path.shift();
        var preRet = []
        traverseDir(p,function(name){preRet.push(name)},function(){
            ret = ret.concat(preRet);
            call();
        },ignore,filter);
    })();
}

function treePromise(path,ignore,filter){
    var dfd = Q.defer();
    fs.exists(path,function(flag){
        if (flag) tree(path,dfd.resolve,ignore,filter);
        else dfd.resolve([]);
    });
    return dfd.promise;
}

exports.traverseDir = traverseDir;
exports.tree = tree;
exports.treePromise = treePromise;