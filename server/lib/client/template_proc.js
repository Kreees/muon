var app = m.app,
    fs = require("fs"),
    _ = require("underscore")
;

var pre_wrapper = {
    "less": "#{profile} .#{id}[data-pack='#{pack}'] {position: relative;#{data}}",
    "css": "#{profile} .#{id}[data-pack='#{pack}'] {position: relative;#{data}}"
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
    var views_name = name.replace(base_dir+"/","");
    var extension_name = views_name.substr(views_name.lastIndexOf("."));
    var short_name = views_name.substr(views_name.lastIndexOf("/")+1);
    if (/^_/.test(short_name)) return callback(name,"");
    if (extension_name in m.app.engines){
        var prev_tmpl_path = m.app.get("views");
        var template_path = name.split("/").slice(0,-1).join("/");
        m.app.set("views",template_path);
        var uniq = Math.floor(Math.random()*99999999+100000000);
        var tempfile_name = template_path+"/temp_"+uniq+"_"+short_name;
        fs.writeFileSync(tempfile_name,
            prepare(pack,views_name,fs.readFileSync(name,"utf-8")),"utf-8");
        try {
            m.app.render("temp_"+uniq+"_"+short_name,function(e,data){
                try{
                    m.app.set("views",prev_tmpl_path);
                    if (e) throw e;
                    fs.unlinkSync(tempfile_name);
                    callback(name,post_proc(pack,views_name,data));
                }
                catch(e){
                    m.app.set("views",prev_tmpl_path);
                    fs.unlinkSync(tempfile_name);
                    console.log("Error on tempalte: ",name);
                    m.log(e.stack);
                    throw e;
                }
            });
        }
        catch(e){
            m.app.set("views",prev_tmpl_path);
            if (fs.existsSync(tempfile_name)) fs.unlinkSync(tempfile_name);
            console.log("Error on tempalte: ",name);
            m.log(e.stack);
            throw e;
        }
        return;
    }
    else{
        callback(name,post_proc(pack,views_name,prepare(pack,views_name,fs.readFileSync(name,"utf-8"))));
    }
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