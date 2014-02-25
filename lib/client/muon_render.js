/**
 Файл собирающий воедино библиотеку muon.js
 библиотека хранится в папке проекта библиотеки /client/muon

 в данном случае нет никаких методов с зависимостями AMD, библиотека разбита на именованные файлы,
 для удобства редактирования

 в конце исходного кода библотеки подставляются закрытые переменные __domain__,
 __serverMode__, и __protocol__.

    __domain__ и __protocol__ используются для формирования url, по которому будут
        запрашиваться модели данных, нужно это в первую очередь для того, чтобы выгружать
        данные клиентских пакетов с других доменов и серверов

    __serverMode__ управляет процессом подключения вьюх, а также должен влиять на методы ведения логов

 */

var fs = require("fs");

module.exports = function (){
    var dir = fs.readdirSync(m.sys.path+"/client/muon/");
    dir.sort();
    var data = "(function(){\n";
    for(var i in dir){
        if (!/\.js$/.test(dir[i])) continue;
        data += fs.readFileSync(m.sys.path+"/client/muon/"+dir[i],"utf8")
    }
    data += "\n\n";
    data += "__domain__ = '"+ (m.cfg.domain || m.cfg.host +":"+ m.cfg.port)+"',"+
            "__serverMode__ = '"+m.cfg.serverMode+"',"+
            "__protocol__ = '"+(m.cfg.secure?"https":"http")+"';";
    data += "\n})();\n\n";
    return data;
}