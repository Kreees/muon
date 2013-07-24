var fs_ext = require(global.m.__sys_path+"/server/lib/utils/fs/fs_ext.js"),
    api_router = require(global.m.__sys_path+"/server/lib/router/api_router.js"),
    doc_router = require(global.m.__sys_path+"/server/lib/router/doc_router.js"),
    db = require(global.m.__sys_path+"/server/lib/utils/db/database.js"),
    models = require(global.m.__sys_path+"/server/lib/models/models.js"),
    models_render = require(global.m.__sys_path+"/server/lib/models/model_render.js"),
    plugins = require(global.m.__sys_path+"/server/lib/plugins/plugins.js"),
    templ_proc = require(global.m.__sys_path+"/server/lib/utils/templates/template_proc.js"),
    tr_proc = require(global.m.__sys_path+"/server/lib/utils/templates/translation_proc.js"),
    fs = require("fs"),
    ejs = require("ejs"),
    _ = require("underscore"),
    Q = require("q")
;

global.m.getRandomString = function(length){
    var ret = "";
    for(var i = 0; i < length; i++){
        ret += Math.floor(Math.random()*256).toString(16);
    }
    return ret;
}

function init_server(next){
    next = next || function(){}
    global.m.__plugins = {}
    global.m.__plugins[""] = global.m;
    Q.when(db.init("mongodb://"+global.m.cfg.db_host+"/"+global.m.cfg.db_name)).then(
        function(){
            global.m.plugins = {};
            plugins.init(global.m.cfg).then(
                function(a){
                    for(var i in a){
                        if (i in global.m.__plugins) continue;
                        global.m.__plugins[i] = a[i];
                        global.m.plugins[i] = a[i];
                    }
                    models.init(global.m.cfg).then(
                        function(a){
                            for(var i in a) global.m[i] = a[i];
                            next();
                        },function(e){ throw Error("Models load error!");})
                },function(e){ throw Error("Plugins load error!");})
        },function(){ throw Error("Database load error!");});
    return this;
}

function compile_client(base_dir){
    var dfd = Q.defer();
    _.defer(function(){
        var file = global.m.path+"/"+base_dir+"/index.html"
        if (fs.existsSync(global.m.path+"/client/assets/index.html")) file = global.m.path+"/client/assets/index.html";
        dfd.resolve(fs.readFileSync(file,"utf8"));
    })
    return dfd.promise;
}

function errorize(res,status,error){
    res.status(status);
    res.end(JSON.stringify({error: error}));
}

function compile_package(req,res){
    try {var pack = require(global.m.path+"/client/packages"+req.path+"/package.js");}
    catch(e){
        console.log(e, e.stack.join("\n"));
        errorize(req,404,"package load error: "+req.path.replace("/",""))
        return;
    }
    pack.dependencies = pack.dependencies || [];
    pack.models = pack.models || [];

    var views = [],
        models = null,
        dependencies = null,
        callback_text = null,
        open_script = "",
        close_script = "",
        viewsdir = global.m.path+"/client/packages"+req.path+"/views",
        pack_name = req.path.replace(/\//g,""),
        pack_translation = {};

    var pack_model_list = models_render.get_model_names(pack.models);
    function model_render(trs){
        pack_translation = trs;
        models_render.render_models(_.without.apply(_,[pack_model_list].concat(req.body.models)),function(data){
            models = data; view_render();
        })
    }
    function view_render(){
        fs_ext.tree(viewsdir+"/model",
            function(t){templ_proc.render_template(t,viewsdir,pack_name,function(r_views){
            views = views.concat(r_views);
        fs_ext.tree(viewsdir+"/collection",
            function(t){templ_proc.render_template(t,viewsdir,pack_name,function(r_views){
            views = views.concat(r_views);
        fs_ext.tree(viewsdir,
            function(t){templ_proc.render_template(t,viewsdir,pack_name,function(r_views){
            views = views.concat(r_views);
            load_package();
        })},["views/model","views/collection"]);
        })});
        })});
    }

    function load_package(){
        callback_text = fs.readFileSync(global.m.path+"/client/packages"+req.path+"/package.js","utf8");
        callback_text = callback_text.replace(/^(\s*module\.exports\s*=\s*)|(;$)/g,"");
        callback_text = "<script data-pack='"+pack_name+"'>\n"
                        +"m.__package_init_data['"+pack_name+"'] = ["+callback_text+","+JSON.stringify(pack_translation)+"];\n</script>";

        open_script += "<script type='text/javascript'>";
        open_script += "window.__prev_package__ = m.__current_package__;";
        open_script += "m.__current_package__ = '"+pack_name+"';"
        open_script += "m.packages[m.__current_package__] = {"
        open_script += "    views: {},"
        open_script += "    views_unnamed: {},"
        open_script += "    router_path: null,"
        open_script += "    loaded: false,"
        open_script += "    translation: {}"
        open_script += "};"
        open_script += "</script>\n"

        close_script += "<script type='text/javascript'>"
        close_script += "   m.__current_package__ = __prev_package__;";
        close_script += "   delete __prev_package__";
        close_script += "</script>\n";
        finalize();
    }
    function finalize(){
        res.set("Content-Type","text/plain");
        _.defer(res.end,models+open_script+views.join("")+callback_text+close_script);
    }

    tr_proc.render_translation(pack_name,req.query.lang || global.m.default_lang,model_render);
}

function package_translation(req,res){
    if (!req.query.lang) return errorize(res,500,"language is not specified");
    var packs = _.union(_.compact((req.query.packs || "").split(",")));
    var counter = packs.length;
    if(counter == 0) return res.end("{}");
    var ret = {};
    for(var i in packs){
        (function(pack_name){
            tr_proc.render_translation(pack_name,req.query.lang || global.m.default_lang,function(trs){
                counter--;
                ret[pack_name] = trs;
                if(counter == 0) res.end(JSON.stringify(ret));
            });
        })(packs[i]);
    }
};

module.exports = {
    init: init_server,
    compile_client: compile_client,
    package_renders: compile_package,
    package_translation: package_translation,
    middleware: function(req,res,next){next();},
    api_proc: api_router,
    docs: doc_router
}