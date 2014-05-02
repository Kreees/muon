module.exports = function(self,deps){
    var templateProc = self.require("share/template-proc"),
        fsExt = deps.utils.fsExt,
        _ = require("underscore"),
        fs = require("fs"),
        Q = require("q");

    return function (plugin,packageName,viewName){
        var dfd = Q.defer();
        var packageDir = plugin.cfg.path+"/client/packages/"+packageName+"/";

        var viewsDir = packageDir+"views";
        var baseViewsDir = packageDir+"views";
        var fullPackName = (plugin.cfg.name.length > 0?plugin.cfg.name+":":"")+packageName;

        viewName = viewName.split("/").map(function(a){
            return a.split("_").reverse().join("/");
        }).join("/");

        viewName = viewName.split("/");

        while(fs.existsSync(viewsDir+"/"+viewName[0]))
            viewsDir += "/"+viewName.shift();

        viewName = viewName.join("/");


        function renderViews(){
            var files = fs.readdirSync(viewsDir+"/"+viewName)
                .filter(function(file){
                    var stat = fs.statSync(viewsDir+"/"+viewName+"/"+file);
                    return stat.isFile();
                }).map(function(file){
                    return viewsDir+"/"+viewName+"/"+file;
                });

            templateProc(files,baseViewsDir,fullPackName).then(function(rViews){

                rViews = rViews.filter(function(a){ return a.match(/<script type='text\/javascript'/); })[0];
                if (rViews) rViews = rViews.replace(/^<script type='text\/javascript'[\s\S]*?>/,"")
                     .replace(/<\/script>$/,"");
                dfd.resolve(rViews || "");
            }).done();
        }

        (function findView(){
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
                return dfd.reject(new self.ViewNotExists())
            }
            renderViews();
        })();

        return dfd.promise;
    };
}