var templ_proc = require(m.__sys_path+"/server/lib/client/template_proc"),
    fs_ext = require(m.__sys_path+"/server/lib/utils/fs/fs_ext"),
    _ = require("underscore"),
    fs = require("fs");

module.exports = function (req,res){
    var plug_name = req.path.replace(/^\//g,"").split(":").slice(0,-1).join(":"),
        plugin = m.__plugins[plug_name],
        full_pack_name = req.path.replace(/^\//g,"").split("/")[0],
        pack_name = full_pack_name.split(":").pop(),
        view_name = req.path.replace(/^\//g,"").split("/").slice(1).join("/"),
        package_dir = plugin.cfg.path+"/client/packages/"+pack_name+"/";

    if (!fs.existsSync(package_dir+"package.js")){
        return m.errorize(res,404,"Package load error: "+pack_name+" from plugin "+plug_name);;
    }

    var views_dir = package_dir+"views";
    view_name = view_name.split("/").map(function(a){
        return a.split("_").reverse().join("/");
    }).join("/");

    function find_view(){
        if (!fs.existsSync(views_dir+"/"+view_name)) {
            var view_stack = view_name.split("/");
            var counter = 1;
            while(counter <= view_stack.length){
                var new_views_dir = views_dir +"/"+view_stack.slice(0,counter).reverse().join("/");
                console.log(counter,view_stack,new_views_dir);
                if (fs.existsSync(new_views_dir)) return find_again();
                new_views_dir = views_dir +"/"+view_stack.slice(0,counter).reverse().join("_");
                if (fs.existsSync(new_views_dir)) return find_again();
                else counter++;

                function find_again(){
                    views_dir = new_views_dir;
                    view_name = view_stack.slice(counter).join('/');
                    find_view();
                }
            }
            return m.errorize(res,404,"View is not found: "+view_name+" from package "+(plug_name?plug_name+":":"")+pack_name);
            return res.end("");
        }
        render_view();
    }
    function render_view(){
        fs_ext.tree(views_dir+"/"+view_name,function(t){
            templ_proc.render_template(t,views_dir,full_pack_name,function(r_views){
                r_views = r_views.filter(function(a){
                    return a.match(/^<script type='text\/javascript'/);
                })[0]
                    .replace(/^<script type='text\/javascript'[\s\S]*?>/,"")
                    .replace(/<\/script>$/,"");
                res.set("Content-Type","text/javascript");
                res.end(r_views || "");
            });
        });
    }
    find_view();
};