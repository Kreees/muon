var app = m.app,
    fs = require("fs"),
    path = m.path,
    _ = require("underscore")
;

var pre_wrapper = {
    "less": "#{profile}.#{id}[data-pack='#{pack}'] {position: relative;#{data}}",
    "css": "#{profile}.#{id}[data-pack='#{pack}'] {position: relative;#{data}}"
};

var post_wrapper = {
    "less": "<!-- #{pack}:#{name} --><style data-pack='#{pack}'>#{data}</style>",
    "css": "<!-- #{pack}:#{name} --><style data-pack='#{pack}'>#{data}</style>",
    "js": "<!-- #{pack}:#{name} --><script type='text/javascript' data-pack='#{pack}'>#{data}</script>",
    "coffee": "<!-- #{pack}:#{name} --><script type='text/javascript' data-pack='#{pack}'>#{data}</script>",
    "jade": "<!-- #{pack}:#{name} --><script #{profile} data-pack='#{pack}' type='text/muon-template' id='#{id}_template'>#{data}</script>",
    "html": "<!-- #{pack}:#{name} --><script #{profile} data-pack='#{pack}' type='text/muon-template'id='#{id}_template'>#{data}</script>",
    "jqote": "<!-- #{pack}:#{name} --><script #{profile} data-pack='#{pack}' type='text/muon-template' id='#{id}_template'>#{data}</script>"
}

function prepare(pack,name,data){
    if (data.length == 0) return "";
    var extension_name = name.substr(name.lastIndexOf(".")+1);
    name = name.replace(RegExp("\\."+extension_name+"$"),"");
    var id = name.substr(0,name.lastIndexOf("/"));
    id = id.split("/").reverse().join("_");
    var profile = "muon";
    if (name.indexOf(".") != -1){
        profile = _.uniq(name.split(".").splice(1).concat(["muon"])).sort().join(".");
        name = name.split(".")[0];
    }
    if (/^_/.test(name.split("/")[name.split("/").length-1])) return "";
    if (extension_name in pre_wrapper){
        data = pre_wrapper[extension_name]
            .replace("#{data}",data.replace(/\n/g,"\n\t"))
            .replace(/#\{name\}/g,name)
            .replace(/#\{id\}/g,id)
            .replace(/#\{pack\}/g,pack);
        if (["css","less"].indexOf(extension_name) != -1){
            data = data.replace(/#\{profile\}/g,profile?"body."+profile:"");
        }
    }
    return data;
}

function media_query_proc(data){
    var last_index_of = 0;
    var index_of = 0;
    for(index_of = data.indexOf("@media",last_index_of); index_of != -1;){
        // TODO
    }
    return data;
}

function post_proc(pack,name,data){
    if (data.length == 0) return "";
    var extension_name = name.substr(name.lastIndexOf(".")+1);
    var id = name.substr(0,name.lastIndexOf("/"));
    id = id.split("/").reverse().join("_");
    name = name.replace(RegExp("\\."+extension_name+"$"),"");
    var profile = "muon";
    if (name.indexOf(".") != -1){
        profile = _.uniq(name.split(".").splice(1).concat(["muon"])).sort().join(".");
        name = name.split(".")[0];
    }
    if (extension_name in post_wrapper){
        if (["css","less"].indexOf(extension_name)){
            data = media_query_proc(data);
        }
        data = post_wrapper[extension_name].replace("#{data}",data)
            .replace(/#\{name\}/g,name)
            .replace(/#\{id\}/g,id)
            .replace(/#\{pack\}/g,pack);
        if (data.indexOf("type='text/javascript'") != -1){
            data = data.replace(/\.extend\(\{\s*/,
                    ".extend({\n\t    template:'"+id.replace(/_[a-zA-Z0-9]+$/g,"")+"',\n\t    ")
                .replace(/,[\s\n]*\}/g,"\n\t  }");

        }
        if (["jade","html","jqote"].indexOf(extension_name) != -1){
            data = data.replace(/#\{profile\}/g,profile?"data-profile='"+profile+"'":"");
        }
    }
    return data;
}

function exec(name,base_dir,pack,callback){
    var template_name = name.replace(path+"/","");
    var views_name = name.replace(base_dir+"/","");
    var extension_name = template_name.substr(template_name.lastIndexOf("."));
    var short_name = template_name.substr(template_name.lastIndexOf("/")+1);
    if (/^_/.test(short_name)) return callback(name,"");
    if (extension_name in m.app.engines){
        var prev_tmpl_path = m.app.get("views");
        m.app.set("views",name.split("/").slice(0,-1).join("/"));
        try {
            m.app.render(short_name,function(e,data){
                m.app.set("views",prev_tmpl_path);
                if (e) throw e;
                callback(name,post_proc(pack,views_name,data));
            });
        }
        catch(e){
            m.app.set("views",prev_tmpl_path);
            console.log("Error on tempalte: ",name);
            console.log(e.stack);
            throw e;
        }
        return;
    }
    else callback(name,post_proc(pack,views_name,prepare(pack,views_name,fs.readFileSync(name,"utf-8"))));
}

module.exports = {
    render_template: function(templates,base_dir,pack,callback){
        var target = [];
        var counter = templates.length;
        if (counter == 0) callback([]);
        for(var i in templates){
            exec(templates[i],base_dir,pack,function(name,data){
                counter--;
                target.push(data);
                if (counter == 0){
                    callback(target.filter(function(a){return !!a;}));
                }
            })
        }
    }
}