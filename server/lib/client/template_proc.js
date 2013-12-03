var app = m.app,
    fs = require("fs"),
    _ = require("underscore")
;

var preWrapper = {
    "less": "#{profile} [data-pack='#{pack}'][data-muon$='#{id}'] {& {position: relative;} #{data}}",
    "css": "#{profile} [data-pack='#{pack}'][data-muon$='#{id}'] {& {position: relative;} #{data}}"
};

var postWrapper = {
    "less": "<!-- #{pack}:#{name} --><style data-pack='#{pack}'>#{data}</style>",
    "css": "<!-- #{pack}:#{name} --><style data-pack='#{pack}'>#{data}</style>",
    "js": "<script type='text/javascript' data-pack='#{pack}' id='#{id}'>#{data}</script>",
    "coffee": "<script type='text/javascript' data-pack='#{pack}' id='#{id}'>#{data}</script>",
    "jade": "<script #{profile} data-pack='#{pack}' type='text/muon-template' id='#{id}_template'>#{data}</script>",
    "html": "<script #{profile} data-pack='#{pack}' type='text/muon-template'id='#{id}_template'>#{data}</script>",
    "jqote": "<script #{profile} data-pack='#{pack}' type='text/muon-template' id='#{id}_template'>#{data}</script>"
};

function prepare(pack,name,data){
    if (data.length == 0) return "";
    var extensionName = name.substr(name.lastIndexOf(".")+1);
    name = name.replace(RegExp("\\."+extensionName+"$"),"");
    var id = name.substr(0,name.lastIndexOf("/"));
    id = id.split("/").reverse().join("_");
    var profile = "muon";
    if (name.indexOf(".") != -1){
        profile = _.uniq(name.split(".").splice(1).concat(["muon"])).sort().join(".");
        name = name.split(".")[0];
    }
    if (extensionName in preWrapper){
        data = preWrapper[extensionName]
            .replace("#{data}",data.replace(/\n/g,"\n\t"))
            .replace(/#\{name\}/g,name)
            .replace(/#\{id\}/g,id)
            .replace(/#\{pack\}/g,pack);
        if (["css","less"].indexOf(extensionName) != -1){
            data = data.replace(/#\{profile\}/g,profile?"body."+profile:"");
        }
    }
    return data;
}

function postProc(pack,name,data){
    if (data.length == 0) return "";
    var extensionName = name.substr(name.lastIndexOf(".")+1);
    var id = name.substr(0,name.lastIndexOf("/"));
    id = id.split("/").reverse().join("_");
    name = name.replace(RegExp("\\."+extensionName+"$"),"");
    var profile = "muon";
    if (name.indexOf(".") != -1){
        profile = _.uniq(name.split(".").splice(1).concat(["muon"])).sort().join(".");
        name = name.split(".")[0];
    }
    if (extensionName in postWrapper){
        data = postWrapper[extensionName].replace("#{data}",data)
            .replace(/#\{name\}/g,name)
            .replace(/#\{id\}/g,id)
            .replace(/#\{pack\}/g,pack);
        if (data.indexOf("type='text/javascript'") != -1){
            data = data.replace(/\.extend\(\{\s*/,
                    ".extend({\n\t    template:'"+id.replace(/_[a-zA-Z0-9]+$/g,"")+"',\n\t    ")
                .replace(/,[\s\n]*\}/g,"\n\t  }");
        }
        if (["jade","html","jqote"].indexOf(extensionName) != -1){
            data = data.replace(/#\{profile\}/g,profile?"data-profile='"+profile+"'":"");
        }
    }    
    return data;
}

function exec(name,baseDir,pack,callback){
    var viewName = name.replace(baseDir+"/","");
    var extensionName = viewName.substr(viewName.lastIndexOf("."));
    var shortViewName = viewName.substr(viewName.lastIndexOf("/")+1);
    if (/^_/.test(shortViewName)) return callback(name,"");
    if (extensionName in m.app.engines){
        var prevTemplatePath = m.app.get("views");
        var templatePath = name.split("/").slice(0,-1).join("/");
        m.app.set("views",templatePath);
        var uniq = Math.floor(Math.random()*99999999+100000000);
        var tempFileName = templatePath+"/temp_"+uniq+"_"+shortViewName;
        fs.writeFileSync(tempFileName,
            prepare(pack,viewName,fs.readFileSync(name,"utf-8")),"utf-8");
        m.app.render("temp_"+uniq+"_"+shortViewName,function(e,data){
            m.app.set("views",prevTemplatePath);
            fs.unlinkSync(tempFileName);
            setTimeout(function(){callback(name,e?"":postProc(pack,viewName,data));},0);
            if (e){
                m.log("Error on tempalte: ",name);
            };
        });
        return;
    }
    else{
        callback(name,postProc(pack,viewName,prepare(pack,viewName,fs.readFileSync(name,"utf-8"))));
    }
}

module.exports = {
    renderTemplate: function(templates,baseDir,pack,callback){
        var target = [];
        var counter = templates.length;
        if (counter == 0) callback([]);
        templates = templates.sort(function(a,b){
            a = a.split("/").length;
            b = b.split("/").length;
            if (a > b) return 1;
            else if (a == b) return 0;
            else return -1;
        });
        for(var i in templates){
            exec(templates[i],baseDir,pack,function(name,data){
                counter--;
                target.push(data);
                try{
                    if (counter == 0){
                        callback(target.filter(function(a){return !!a;}));
                    }
                }
                catch(e) {console.log(e);}
            })
        }
    }
}