var fs = require("fs"),
    _ = require("underscore")
;

var app = global.m.app;
var path = global.m.path;

function find_pattern(str,pattern_array){
    str = str || "";
    pattern_array = pattern_array || [];
    if (pattern_array.length == 0) return false;
    for(var i in pattern_array){
        if(str.match(pattern_array[i]) !== null) return true;
    }
    return false;
}

function traverse_dir(path,__call__,compl,ignore,filter,__counter__){
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
        if (find_pattern(path+dir[i],ignore) || dir[i].replace(/^(temp_[\s\S]*)|(\.+[\s\S]*)|([\s\S]*~)|([\s\S]*\.back)$/,"wrong")=="wrong")
        {
            counter--;
            if (counter == 0) return __compl__();
            continue;
        }
        var file_name = path+"/"+dir[i];
        var stat = fs.statSync(file_name);
        counter--;
        if (stat.isFile()){
            if (filter.length == 0 || find_pattern(file_name.substring(file_name.lastIndexOf("/")),filter)){
                __call__(file_name.replace(/\/+/g,"/"),stat);
            }
        }
        else traverse_dir(file_name,__call__,compl,ignore,filter,counter);
        if (counter == 0) return __compl__ && __compl__();
    }
};

module.exports = {
    cat_directory: function(dir,callback){
        var temp = [];
        traverse_dir(dir,function(name){temp.push(name)},function(){
            var counter = temp.length;
            var rendered = [];
            if (counter == 0) callback(rendered.join("\r\n"));
            else
                for(var i in temp){
                    app.render(temp[i],function(e,data){
                        counter--;
                        if (e) {throw e;}
                        rendered.push(data);
                        if (counter == 0) callback(rendered.join("\r\n"));
                    });
                }
        });
    },
    tree: function(path,callback,ignore,filter){
        var ret = [];
        traverse_dir(path,function(name){ret.push(name)},function(){
            callback(_.sortBy(ret,function(name){return name}));
        },ignore,filter);
    },
    traverse_dir: traverse_dir
}