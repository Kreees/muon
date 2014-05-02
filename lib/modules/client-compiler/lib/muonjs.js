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

module.exports = function(self,deps){
    var fs = require("fs");
    var cfg = deps.config.load();
    var path = require("path");
    var Q = require("q");
    return function (){
        var dir = fs.readdirSync(path.normalize(self.path+"/lib/muonjs/"));
        dir.sort();
        var data = "(function(){\n";
        for(var i in dir){
            if (!/\.js$/.test(dir[i])) continue;
            data += fs.readFileSync(path.normalize(self.path+"/lib/muonjs/"+dir[i]),"utf8")
        }
        data += "\n";
        data += "__domain__ = '"+ cfg.domain+"',"+
                "__serverMode__ = '"+cfg.serverMode+"',"+
                "__protocol__ = '"+ cfg.protocol +"';";
        data += "\n})();\n";
        return Q(data);
    }
}