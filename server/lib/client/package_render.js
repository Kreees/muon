/**
 Данный метод является одним из частей api сервера

 Формируются данные одного из запрашиваемых пакетов.

 В результате запроса данных пакета на клиент возвращается:
    - дескриптор пакета, представленный в файле package.js
    - содержание вьюх (включая верстку, стили и JS-код каждоый из вьюх)
    - css и js файлы, помещенные в соответствующих dependency папках
    - описание моделей сервера, от которых зависит работа данного пакета

 результат вызова помещается как аргумент callback метода (JSONP)
*/

var templProc = require(m.__sys_path+"/server/lib/client/template_proc"),
    trProc = require(m.__sys_path+"/server/lib/client/translation_proc"),
    modelsRender = require(m.__sys_path+"/server/lib/models/model_render"),
    fsExt = require(m.__sys_path+"/server/lib/utils/fs/fs_ext"),
    _ = require("underscore"),
    fs = require("fs");

module.exports = function (req,res){
    /**
     * определяем имя пакета, плагина, в который входит пакет, полное название пакета, а также директорию его размещения
     * */
    var plugName = req.path.replace(/\//g,"").split(":").slice(0,-1).join(":"),
        plugin = m.__plugins[plugName],
        fullPackName = req.path.replace(/\//g,""),
        packName = fullPackName.split(":").pop(),
        packageDir = plugin.cfg.path+"/client/packages/"+packName+"/";

    /**
     * Признак существования пакета - наличие файла package.js в корневой директории пакета
     */
    try {var pack = require(packageDir+"package.js");}
    catch(e){
        return m.errorize(res,404,"Package load error: "+packName+" from plugin "+plugName);
    }

    /**
     * переменная не используется
     * предполагается, что перечень зависимостей в пакете (dependency/js и dependency/css) должны быть явно указаны
     * пока в пакет пробрасывается все, что находится в данных директориях
     */
    pack.dependencies = pack.dependencies || ["*"];

    /**
     *
     * Переменна хранит в себе список моделей-зависимостей в виде простых регулярных выражений
     */
    if (m.cfg.serverMode == "development") pack.models = ["*"];
    else pack.models = pack.models || [];

    var views = [],
        dependency = {js:[],css:[]},
        models = null,
        callbackText = null,
        viewsDir = packageDir+"views",
        packTranslation = {};

    function modelRender(trs){
        packTranslation = trs;
        modelsRender.renderModels(plugin,pack.models,function(data){
            models = data; viewRender();
        });
    }
    function viewRender(){
        fsExt.tree(viewsDir+"/model",
            function(t){templProc.renderTemplate(t,viewsDir,fullPackName,function(rViews){
                views = views.concat(rViews);
                fsExt.tree(viewsDir+"/collection",
                    function(t){templProc.renderTemplate(t,viewsDir,fullPackName,function(rViews){
                        views = views.concat(rViews);
                        fsExt.tree(viewsDir,
                            function(t){templProc.renderTemplate(t,viewsDir,fullPackName,function(rViews){
                                views = views.concat(rViews);
                                loadPackage();
                            })},["views/model","views/collection"]);
                    })});
            })});
    }

    function loadPackage(){
        callbackText = fs.readFileSync(packageDir+"package.js","utf8");
        callbackText = callbackText.replace(/^(\s*module\.exports\s*=\s*)|(;$)/g,"");
        callbackText = "m.packageInitData['"+fullPackName+"'] = {\n"+
            "\"package\": "+callbackText+",\n\n"+
            "\"models\": "+JSON.stringify(models)+",\n\n"+
            "\"views\": "+JSON.stringify(views)+",\n\n"+
            "\"translation\": "+JSON.stringify(packTranslation)+",\n\n"+
            "\"dependencies\": "+JSON.stringify(dependency)+",\n\n"+
            "\"cfg\": "+JSON.stringify((plugin.cfg.packages && plugin.cfg.packages[packName])?plugin.cfg.packages[packName]:{})+",\n\n"+
            "\n};";
        if (req.query.m_callback) callbackText += "\ntry{ m['"+req.query.m_callback+"']();} catch(e){console.log('Callback f called: '+e.message); console.debug(e.stack)}";
        finalize();
    }
    function finalize(){
        res.set("Content-Type","text/javascript");
        res.end(callbackText);
    }

    fsExt.tree(packageDir+"dependency/css",function(a){
        var files = a;
        fsExt.tree(packageDir+"dependency/js",function(a){
            files = files.concat(a);
            function procFile(){
                var prevViews = m.app.get("views");
                if (files.length == 0){
                    m.app.set("views",prevViews);
                    trProc.renderTranslation(plugin,packName,req.query.lang || m.defaultLang,modelRender);
                    return
                }
                var file = files.shift();
                var extension = file.substr(file.lastIndexOf(".")+1);
                var tmpFile = file.substr(0,file.lastIndexOf("/")+1)+"temp."+file.substr(file.lastIndexOf("/")+1)+"."+extension;
                function dataRendered(e,data){
                    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
                    if (e){
                        m.log("Can't proc file: "+file);
                        console.log(e);
                        return procFile();
                    }
                    if (["coffee","js"].indexOf(extension) != -1) dependency.js.push(data);
                    if (["less","css"].indexOf(extension) != -1) dependency.css.push(data);
                    procFile();
                }
                if ( "coffee" == extension){
                    m.app.set("views",packageDir+"dependency/"+(["coffee","js"].indexOf(extension) != -1?"js":"css"));
                    m.app.render(file.substr(file.lastIndexOf("/")+1),{},dataRendered);
                }
                else if (["css","less"].indexOf(extension) != -1){
                    fs.writeFileSync(tmpFile,"[data-pack='"+fullPackName+"'] {"+fs.readFileSync(file,"utf-8")+"\n}");
                    m.app.set("views",packageDir+"dependency/"+(["coffee","js"].indexOf(extension) != -1?"js":"css"));
                    m.app.render(tmpFile,{},dataRendered);
                }
                else{
                    fs.readFile(file,"utf8",dataRendered);
                }
            }
            procFile();
        },["/_"],[".js",".coffee"])
    },["/_"],[".css",".less"]);

};