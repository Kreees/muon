var templ_proc = require(m.__sys_path+"/server/lib/client/template_proc"),
    tr_proc = require(m.__sys_path+"/server/lib/client/translation_proc"),
    models_render = require(m.__sys_path+"/server/lib/models/model_render"),
    fs_ext = require(m.__sys_path+"/server/lib/utils/fs/fs_ext"),
    _ = require("underscore"),
    fs = require("fs");

module.exports = function (req,res){
    var plug_name = req.path.replace(/\//g,"").split(":").slice(0,-1).join(":"),
        plugin = m.__plugins[plug_name],
        full_pack_name = req.path.replace(/\//g,""),
        pack_name = full_pack_name.split(":").pop(),
        package_dir = plugin.cfg.path+"/client/packages/"+pack_name+"/";

    try {var pack = require(package_dir+"package.js");}
    catch(e){
        return m.errorize(res,404,"Package load error: "+pack_name+" from plugin "+plug_name);
    }
    pack.dependencies = pack.dependencies || ["*"];

    pack.models = pack.models || [];

    var views = [],
        dependency = {js:[],css:[]},
        models = null,
        callback_text = null,
        views_dir = package_dir+"views",
        pack_translation = {};

    var pack_model_list = models_render.get_model_names(plugin,pack.models);
    function model_render(trs){
        pack_translation = trs;
        models_render.render_models(plugin,pack_model_list,function(data){
            models = data; view_render();
        });
    }
    function view_render(){
        fs_ext.tree(views_dir+"/model",
            function(t){templ_proc.render_template(t,views_dir,full_pack_name,function(r_views){
                views = views.concat(r_views);
                fs_ext.tree(views_dir+"/collection",
                    function(t){templ_proc.render_template(t,views_dir,full_pack_name,function(r_views){
                        views = views.concat(r_views);
                        fs_ext.tree(views_dir,
                            function(t){templ_proc.render_template(t,views_dir,full_pack_name,function(r_views){
                                views = views.concat(r_views);
                                load_package();
                            })},["views/model","views/collection"]);
                    })});
            })});
    }

    function load_package(){
        callback_text = fs.readFileSync(package_dir+"package.js","utf8");
        callback_text = callback_text.replace(/^(\s*module\.exports\s*=\s*)|(;$)/g,"");
        callback_text = "m.__package_init_data['"+full_pack_name+"'] = {\n"+
            "\"package\": "+callback_text+",\n\n"+
            "\"models\": "+JSON.stringify(models,null,2)+",\n\n"+
            "\"views\": "+JSON.stringify(views,null,2)+",\n\n"+
            "\"translation\": "+JSON.stringify(pack_translation,null,2)+",\n\n"+
            "\"dependencies\": "+JSON.stringify(dependency,null,2)+",\n\n"+
            "\n};";
        if (req.query.m_callback) callback_text += "\ntry{ m['"+req.query.m_callback+"']();} catch(e){console.log('Callback f called: '+e.message); console.debug(e.stack)}";
        finalize();
    }
    function finalize(){
        res.set("Content-Type","text/javascript");
        res.end(callback_text);
    }

    fs_ext.tree(package_dir+"dependency/",function(files){
        function proc_file(){
            var prev_views = m.app.get("views");
            if (files.length == 0){
                m.app.set("views",prev_views);
                return tr_proc.render_translation(plugin,pack_name,req.query.lang || m.default_lang,model_render);
            }
            var file = files.shift();
            var extension = file.substr(file.lastIndexOf(".")+1);
            function data_rendered(e,data){
                if (e){
//                    m.log(e);
                    return proc_file();
                }
                if (["coffee","js"].indexOf(extension) != -1) dependency.js.push(data);
                else dependency.css.push(data);
                proc_file();
            }
            if (["coffee","less"].indexOf(extension) != -1){
                m.app.set("views",package_dir+"dependency/"+(["coffee","js"].indexOf(extension) != -1?"js":"css"));
                m.app.render(file.substr(file.lastIndexOf("/")+1),{},data_rendered);
            }
            else fs.readFile(file,"utf8",data_rendered);
        }
        proc_file();
    },["/_"],[".js",".css",".coffee",".less"]);

};