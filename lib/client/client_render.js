/**
    Файл формирующий файл index.html, отдаваемый при запросе клиентского приложения.
    Изначально файл включает базовые зависимости js и css, различную meta инфу и проч, без какого либо
    содержания, связанного с библиотекой.
    В рамках этого метода, в файл добавляются тэг с сылкой на /muon.js
    и локальные переменные проекта (в настоящий момент язык проект)

    метод module.exports подключается напрямую к серверу
*/

var fs = require("fs"),
    _ = require("underscore"),
    Q = require("q"),
    cheerio = require("cheerio");

module.exports = function(req,res){
    var file = m.cfg.path+"/client/index.html";
    if (fs.existsSync(m.cfg.path+"/client/assets/index.html")) file = m.cfg.path+"/client/assets/index.html";
    var $ = cheerio.load(fs.readFileSync(file,"utf8"));
    $("html").attr("lang",m.cfg.defaultLang || "en");
    if(m.cfg.serverMode == "testing"){
        $("head").append('<script src="//cdnjs.cloudflare.com/ajax/libs/mocha/1.13.0/mocha.js"></script>');
        $("head").append('<script src="//cdnjs.cloudflare.com/ajax/libs/expect.js/0.2.0/expect.min.js"></script>');
        $("head").append('<script src="//cdnjs.cloudflare.com/ajax/libs/sinon.js/1.7.3/sinon-min.js"></script>');
        $("head").append("<script type='text/javascript'> mocha.setup('bdd'); mocha.reporter('html'); </script>");
        // $("head").append('<script src="/js/test.js"></script>');
    }
    $("head").append("<script src='/muon.js'></script>");
    res.set("Content-Type","text/html");
    res.end($.html());
};
