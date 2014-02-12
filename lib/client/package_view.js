var templateProc = m.__require__("/client/template_proc"),
    fsExt = m.__require__("/utils/fs/fs_ext"),
    _ = require("underscore"),
    fs = require("fs");

module.exports = function (req,res){
    var pluginName = req.path.replace(/^\//g,"").split(":").slice(0,-1).join(":"),
        plugin = m.__plugins[pluginName],
        fullPackName = req.path.replace(/^\//g,"").split("/")[0],
        packageName = fullPackName.split(":").pop(),
        viewName = req.path.replace(/^\//g,"").split("/").slice(1).join("/"),
        packageDir = plugin.cfg.path+"/client/packages/"+packageName+"/";

    if (!fs.existsSync(packageDir+"package.js")){
        return m.errorize(res,404,"Package load error: "+packageName+" from plugin "+pluginName);;
    }

    var viewsDir = packageDir+"views";
    var baseViewsDir = packageDir+"views";
    viewName = viewName.split("/").map(function(a){
        return a.split("_").reverse().join("/");
    }).join("/");
    viewName = viewName.split("/");

    while(fs.existsSync(viewsDir+"/"+viewName[0]))
        viewsDir += "/"+viewName.shift();

    viewName = viewName.join("/");
    function findView(){
        if (!fs.existsSync(viewsDir+"/"+viewName)) {
            var viewStack = viewName.split("/");
            var counter = 1;
            while(counter <= viewStack.length){
                var newViewsDir = viewsDir +"/"+viewStack.slice(0,counter).reverse().join("/");
                if (fs.existsSync(newViewsDir)) return findAgain();
                newViewsDir = viewsDir +"/"+viewStack.slice(0,counter).reverse().join("_");
                if (fs.existsSync(newViewsDir)) return findAgain();
                else counter++;

                function findAgain(){
                    viewsDir = newViewsDir;
                    viewName = viewStack.slice(counter).join('/');
                    findView();
                }
            }
            m.error(404,"View is not found: "+viewName+" from package "+(pluginName?pluginName+":":"")+packageName);
            return m.errorize(res,404,"View is not found: "+viewName+" from package "+(pluginName?pluginName+":":"")+packageName);
        }
        renderViews();
    }
    function renderViews(){
        fsExt.tree(viewsDir+"/"+viewName,function(t){
            templateProc.renderTemplate(t,baseViewsDir,fullPackName,function(rViews){
                rViews = rViews.filter(function(a){
                    return a.match(/^<script type='text\/javascript'/);
                })[0]
                    .replace(/^<script type='text\/javascript'[\s\S]*?>/,"")
                    .replace(/<\/script>$/,"");
                res.set("Content-Type","text/javascript");
                res.end(rViews || "");
            });
        });
    }
    findView();
};