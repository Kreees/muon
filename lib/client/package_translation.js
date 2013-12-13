/**
 Данный метод является одним из частей api сервера

 В данном файле формируется JSON-описание с переводами интерфейса всех вьюх для указанных пакетов

 соответствует запросу /pack_translate?muon
 в качестве GET-аргумента перечень пакетов, для которых требуется перевод через запятую,
 напр: ?muon&pack=admin,application,tutor

 программа обходит содержимое всех указанных пакетов в подпапке tr и формирует словарь переводов изходя из того,
 что имена (и пути) файлов с переводом соответствует пути одной из вьюх в папке views.

 Например: stack/application/application.jade содержит в себе тэги с атрибутами data-tr='welcome'
            в этом случае для перевод интерфейса на английский язык требуется файл
            en/stack/application/tr.json примерно следующего содержания
            {
                'welcome': "Welcome to the muon.js project!"
            }
 */


var trProc = require(m.__syspath+"/lib/client/translation_proc"),
    _ = require("underscore");

module.exports = function(req,res){
    var lang = req.path.replace(/^\//,"");
    if (!lang) {
        m.errorize(res,500,"language is not specified");
        return;
    }

    var packs = _.union(_.compact((req.query.packs || "").split(",")));
    var counter = packs.length;
    if(counter == 0){
        res.end("{}");
        return;
    }
    var ret = {};
    for(var i in packs){
        (function(packName){
            var pluginName = packName.split(":").slice(0,-1).join(":"),
                plugin = m.__plugins[pluginName],
                fullPackName = packName,
                packName = fullPackName.split(":").pop();
            trProc.renderTranslation(plugin,packName,lang || m.defaultLang,function(trs){
                counter--;
                ret[fullPackName] = trs;
                if(counter == 0){
                    res.set("Content-Type","application/json");
                    res.end(JSON.stringify(ret));
                }
            });
        })(packs[i]);
    }
};