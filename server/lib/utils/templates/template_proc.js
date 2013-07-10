var app = global.m.app,
    fs = require("fs"),
    path = global.m.path
;

var pre_wrapper = {
    "less": "\t.#{id}[data-pack='#{pack}'] {\n\tposition: relative;\n\t\t#{data}\n}",
    "css": "\t.#{id}[data-pack='#{pack}'] {\n\tposition: relative;\n\t\t#{data}\n}"
};

var post_wrapper = {
    "less": "\n<!-- #{pack}:#{name} -->\n<style data-pack='#{pack}'>\n#{data}\n</style>\n",
    "css": "\n<!-- #{pack}:#{name} -->\n<style data-pack='#{pack}'>\n#{data}\n</style>\n",
    "js": "\n<!-- #{pack}:#{name} -->\n<script type='text/javascript' data-pack='#{pack}'>\n#{data}\n</script>\n",
    "coffee": "\n<!-- #{pack}:#{name} -->\n<script type='text/javascript' data-pack='#{pack}'>\n#{data}\n</script>\n",
    "jade": "\n<!-- #{pack}:#{name} -->\n<script data-pack='#{pack}' type='text/muon-template' id='#{id}_template'>\n#{data}\n</script>\n",
    "html": "\n<!-- #{pack}:#{name} -->\n<script data-pack='#{pack}' type='text/muon-template'id='#{id}_template'>\n#{data}\n</script>\n",
    "jqote": "\n<!-- #{pack}:#{name} -->\n<script data-pack='#{pack}' type='text/muon-template' id='#{id}_template'>\n#{data}\n</script>\n"
}

function prepare(pack,name,data,arr){
    if (data.length == 0) return "";
    var extension_name = name.substr(name.lastIndexOf(".")+1);
    var id = name.substr(0,name.lastIndexOf("/"));
    id = id.split("/").reverse().join("_").toLowerCase();
    if (extension_name in arr){
        data = arr[extension_name].replace("#{data}",data.replace(/\n/g,"\n\t"))
                                                         .replace(/#\{name\}/g,name)
                                                         .replace(/#\{id\}/g,id)
                                                         .replace(/#\{pack\}/g,pack);
        if (data.indexOf("type='text/javascript'") != -1){
//            data = data.replace(/template\s*:\s*['"][a-zA-Z0-9_]+['"],?/g,"")
            data = data.replace(/\.extend\(\{\s*/,
                                ".extend({\n\t    template:'"+id.replace(/_[a-zA-Z0-9]+$/g,"")+"',\n\t    ")
                         .replace(/,[\s\n]*\}/g,"\n\t  }");

        }
        return data;
    }
    return data;
}

function exec(name,base_dir,pack,callback){
    var template_name = name.replace(path+"/","");
    var views_name = name.replace(base_dir+"/","");
    var extension_name = template_name.substr(template_name.lastIndexOf("."));
    var templ_data = prepare(pack,views_name,fs.readFileSync(name,"utf-8"),pre_wrapper);
    if (extension_name in global.m.app.engines){
        var temp_file_name = "tmp/temp_"+Math.floor(Math.random()*100000)+"_"+template_name.substr(template_name.lastIndexOf("/")+1);
        var fd = fs.openSync(global.m.path+"/"+temp_file_name,"w+");
        fs.writeSync(fd,templ_data,0,0,0,0);
        fs.close(fd);
        try {
            global.m.app.render(temp_file_name,function(e,data){
                if (e){
                    fs.unlink(path+"/"+temp_file_name);
                    throw e;
                }
                callback(name,prepare(pack,views_name,data,post_wrapper));
                fs.unlink(global.m.path+"/"+temp_file_name);
            });
        }
        catch(e){
            console.log("Error on tempalte: ",name);
            console.log(e.stack);
            throw e;
        }
        return;
    }
    callback(name,prepare(pack,views_name,templ_data,post_wrapper));
}

module.exports = {
    render_template: function(templates,base_dir,pack,callback){
        var target = [];
        var counter = templates.length;
        if (counter == 0) callback();
        for(var i in templates){
            exec(templates[i],base_dir,pack,function(name,data){
                counter--;
                target.push(data);
                if (counter == 0) callback(target);
            })
        }
    }
}