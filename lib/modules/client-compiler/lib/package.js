/**
 Данный метод является одним из частей api сервера

 Формируются данные одного из запрашиваемых пакетов.

 В результате запроса данных пакета на клиент возвращается:
    - дескриптор пакета, представленный в файле package.js
    - содержание вьюх (включая верстку, стили и JS-код каждоый из вьюх)
    - css и js файлы, помещенные в соответствующих dependencies папках
    - описание моделей сервера, от которых зависит работа данного пакета

 результат вызова помещается как аргумент callback метода (JSONP)
*/

module.exports = function(self,deps){
    var templProc = self.require("share/template-proc"),
        trProc = self.require("share/translation-proc"),
        fsExt = deps.utils.fsExt,
        _ = require("underscore"),
        fs = require("fs"),
        cfg = deps.config.load(),
        Q = require("q"),
        path = require("path");

    return function (plugin,packName){
        /**
         * определяем имя пакета, плагина, в который входит пакет, полное название пакета, а также директорию его размещения
         */

        var packageDir = plugin.cfg.path+"/client/packages/"+packName+"/";
        var fullPackName = (plugin.cfg.name.length > 0?plugin.cfg.name+":":"")+packName;

        /**
         * Признак существования пакета - наличие файла package.js в корневой директории пакета
         */



        try {var pack = require(packageDir+"package.js");}
        catch(e){ throw new self.PackageNotExists(); }

//        pack.dependencies = pack.dependencies || ["*"];

        var views = [],
            dependencies = {script:[],style:[]},
            models = {},
            callbackText = null,
            viewsDir = packageDir+"views",
            packTranslation = {};

        var renderTemplates = function(files){
            return templProc(files,viewsDir,fullPackName);
        }

        return Q.when([packageDir+"dependencies/style",["/_"]])
            .spread(fsExt.treePromise)
            .fail(function(){ return []; })
            .then(function(files){
                var dfd = Q.defer();
                self.expressApp.set("views",packageDir+"dependencies/style");
                (function procFile(){
                    if (files.length == 0) return dfd.resolve();
                    var file = files.shift();
                    var extension = file.substr(file.lastIndexOf(".")+1);
                    var tmpFile = file.substr(0,file.lastIndexOf("/")+1)+"temp."+file.substr(file.lastIndexOf("/")+1)+"."+extension;
                    function dataRendered(e,data){
                        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
                        if (e) deps.logger.error("Can't process file: "+file,e);
                        else dependencies.style.push(data);
                        procFile();
                    }
                    if ("css" == extension) fs.readFile(file,"utf8",dataRendered);
                    else self.expressApp.render(file.substr(file.lastIndexOf("/")+1),{},dataRendered);
                })();
                return dfd.promise;
            })
            .then(_.partial(fsExt.treePromise,packageDir+"dependencies/script",["/_"]))
            .fail(function(){ return []; })
            .then(function(files){
                var dfd = Q.defer();
                self.expressApp.set("views",packageDir+"dependencies/script");
                (function procFile(){
                    if (files.length == 0) return dfd.resolve();
                    var file = files.shift();
                    var extension = file.substr(file.lastIndexOf(".")+1);
                    var tmpFile = file.substr(0,file.lastIndexOf("/")+1)+"temp."+file.substr(file.lastIndexOf("/")+1)+"."+extension;

                    function dataRendered(e,data){
                        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
                        if (e) deps.logger.error("Can't process file: "+file,e);
                        else dependencies.script.push(data);
                        procFile();
                    }

                    if ("js" == extension) fs.readFile(file,"utf8",dataRendered);
                    else self.expressApp.render(file.substr(file.lastIndexOf("/")+1),{},dataRendered);
                })();
                return dfd.promise;
            })
            /* Proc package translation */
            .then(_.partial(self.renderTranslation,plugin,packName,cfg.defaultLang))
            .then(function(trs){packTranslation = trs;})
            /* Render models */
            .then(_.partial(deps.plugins.getModels,plugin,pack.models))
            .then(function(list){
                var promise = Q();
                list.reduce(function(p,model){
                    return promise = p.then(_.partial(self.renderModel,model)).then(function(rendered){
                        models[model.fullName] = rendered;
                    });
                },promise);
                return promise;
            })
            /* Render views */
            .then(_.partial(fsExt.treePromise,viewsDir+"/model"))
            .then(renderTemplates)
            .then(function(rViews){
                views = views.concat(rViews);
            })
            .then(_.partial(fsExt.treePromise,viewsDir+"/collection"))
            .then(renderTemplates)
            .then(function(rViews){
                views = views.concat(rViews);
            })
            .then(_.partial(fsExt.treePromise,viewsDir,[path.normalize(viewsDir+"/model"),path.normalize(viewsDir+"/collection")]))
            .then(renderTemplates)
            .then(function(rViews){
                views = views.concat(rViews);
            })
            /* Complete request */
            .then(function(){
                callbackText = fs.readFileSync(packageDir+"package.js","utf8");
                callbackText = "function(exports){var module = {}; "+callbackText+"; return module; }";
                callbackText = "m.packageInitData['"+fullPackName+"'] = {\n"+
                    "\"package\": "+callbackText+",\n\n"+
                    "\"models\": "+JSON.stringify(models)+",\n\n"+
                    "\"views\": "+JSON.stringify(views)+",\n\n"+
                    "\"translation\": "+JSON.stringify(packTranslation)+",\n\n"+
                    "\"dependencies\": "+JSON.stringify(dependencies)+",\n\n"+
                    "\"cfg\": "+JSON.stringify((plugin.cfg.packages && plugin.cfg.packages[packName])?plugin.cfg.packages[packName]:{})+",\n\n"+
                "\n};";
                return callbackText;
            })
    };
};