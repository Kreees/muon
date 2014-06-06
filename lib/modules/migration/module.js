/**
 * Model migration manager - module for syncing models scheme with database tables.
 * Привет. Я и здесь тебя найду!
 *
 * В общем ситуация следующая.
 * Этот файл должен иметь две версии. Первая версия относится к загрузке в режиме миграции, и загрузке в режими
 * девелепмента и продакшена.
 *
 * В режиме миграции выполняется автоматическая обработка моделей в следующей порядке:
 *  1. Инициализируется приложение (плагин с моделями) как оно обычно происходит
 *  2. После завершении инициализации модуля plugins выполняется метод __init__ где ты выполняешь
 *      следующие операции
 *          а) составление различий между моделями
 *          б) запрос модуля плагинс перегрузить приложение,
 *              с переданными в виде объекта {<имя модели>: {<дескриптор модели>}}
 *          в) собственно сам маджик (я думаю, там даже аргументов передавать не надо, так как
 *              перезагруженный scope приложения и так будет в m.app)
 *          г) доделка синхронизации с базой данных
 *          д) формируется штамп состояния моделей и пользовательского модуля миграции, который помещается в спец файлик,
 *              а луче в базу данных sqlite (на этом я настаиваю, модуль sqlite я включил в deps).
 *              Юзерский модуль миграции, может быть удален.
 *          е) завершение работы (по идее, так как ни сервера, ни консоли нет, это должно произойти автоматом)
 *
 *  В остальных режимах работы приложения должно произойти следующее:
 *  1. Также инициализируется приложение
 *  2. Управление в определенный момент доходит до инициализации данного модуля. В данном случае в __init__
 *      выполняется составление различий между моделями в разных состояния, и делается заготовка в корне для
 *      файла миграций (если такой файл уже существует, этого не происходит)
 *
 *  Это все означает следующее: здесь у тебя появится два файла модуля:
 *      - module.js - этот файл будет для всех
 *      - module.migration.js - этот файл будет автоматически выбираться при запуске в режиме миграций
 *
 *  Это в свою очередь означает, что часть кода, которая лежит здесь должна выйти запределы файла, чтобы быть
 *      доступной во втором файле. Это точно касается функции, отвечающей за сравнение состоянии моделей
 *
 *  Мне честно говоря очень давно подправить стилистику твоего кода. Я думаю на этом файле можно будет сделать
 *      код-ревью, но я хочу, чтобы ты удалила все рудименты, я так понял у тебя есть методы и переменные, которыми
 *      ты пользоваться больше не будешь. Когда сделаешь это, я помогу тебе сделать код проще и разнести
 *      его по модулям
 *
 *  Напоследок. Надо разобраться с логикой запуска утилиты миграции. Придумать как будет указываться версионность
 *  Это необходимо для того, чтобы иметь возможность указать необходимую версию миграции для даунгрейда базы,
 *  либо создания промежуточной миграции. Также необходимо продумать формат вывода состояния миграции, а также
 *  вывода перечня всех выполненных миграций
 *
 *  На этом пока все.
 */


module.exports = function(self, deps) {
    var _ = require('underscore');
    var Q = require("q");
    var Sync = require('sql-ddl-sync').Sync;
    var g = require("grunt");

    function _sync(driver_name, driver, scheme) {
        var def = Q.defer();
        setTimeout(function(){def.resolve()},100);
        return def.promise;
//TODO       
        var sync = new Sync({
            dialect : driver_name,
            driver : driver,
            debug : function(text) {
                console.log("> %s", text);
            }
        });
        for (var i in scheme) {
            sync.defineCollection(i, preprocessProperties(scheme[i]));
        }
        sync.sync(function(err) {
            if (err) {
                console.log(">>> Sync Error: " + err);
                return def.reject(new Error(">>> Sync Error: " + err));
            } else {
                console.log(">>> successfull synced.");
                def.resolve();
            }
        });
        return def.promise;
    }

    function _loadState(id, cb) { // пока что из фаила
        var d = Q.defer();
        var dir = m.cfg.path + '/migrations/';
        var uniq = id || 0;
        var sch = {};
        if(!uniq)
            g.file.recurse(dir, function(abspath, rootdir, subdir, filename){
                var num = filename.match(/^\d+/) || uniq;
                if(num > uniq) uniq = num;
            });
        if(uniq && g.file.exists(dir+uniq.toString()+".json"))
            sch = g.file.readJSON(dir+uniq.toString()+".json").scheme || {};
        cb(sch); 
        setTimeout(function() {
            d.resolve();
        }, 100);
        return d.promise;
    }

    function _difference(userS, dbS) { //TODO извлечь информацию об отношениях
        var ormS = JSON.parse(JSON.stringify(dbS));
        var errs = [];
        var rmInfo = {};
        var addInfo = {};
        var toAdd = [];
        for (var mdl in userS) {
            var userModel = userS[mdl];
            var sncModel = ormS[mdl];
            if (sncModel) {// find new models
                for (var atr in userModel) {// find new model attributes
                    if (!sncModel[atr]) {
                        sncModel[atr] = userModel[atr];
                        if (!addInfo[mdl])
                            addInfo[mdl] = [];
                        addInfo[mdl].push(atr);
                    } else {
                        if (!_.isEqual(sncModel[atr], userModel[atr])) {//model attribute was changed - error
                            errs.push("Model: " + mdl + " Attribute: " + atr + ' was changed. Migration cannot be complete.');
                        }
                    }
                }
                for (var atr in sncModel) {// find model attrs to remove
                    if (!userModel[atr]) {
                        if (!rmInfo[mdl])
                            rmInfo[mdl] = [];
                        rmInfo[mdl].push(atr);
                    }
                }
            } else {
                ormS[mdl] = userModel;
                toAdd.push(mdl);
            }
        }
        var toRm = [];
        for (var mdl in ormS) {
            if (!userS[mdl])
                toRm.push(mdl);
        }
        return {
            ormModels : ormS,
            rmModels : toRm,
            rmModelAttr : rmInfo,
            addModelAttr : addInfo,
            addModels : toAdd,
            errs : errs,
            hasOne: false,
            hasMany: false
        };
    }

    function _saveState(path, obj) {
        g.file.write(path, JSON.stringify({
            scheme : obj
        }));
    }

    function _unifyScheme(obj) { // должна унифицировать схему, чтобы не зависило от орма
        return obj;
    }

    function _loadMagic(path) {
        if (!g.file.exists(path)) return false;
        return function() {
            var d = Q.defer();
            setTimeout(function() {
                d.resolve();
            }, 100);
            return d.promise;
        };
    }

    return {
        __init__ : function() {
            
        // },
        // test : function() {
            var dir = m.cfg.path + '/migrations/';
            var driver_name; //TODO
            var driver; //TODO
            
            if (!g.file.exists(dir))
                g.file.mkdir(dir);
            var magic = _loadMagic(dir + "magic.js");
            if(!magic) return console.log("No magic file");
            var usrScheme = {};
            for (var i in m.app.models) {
                usrScheme[i] = m.app.models[i].allProperties;
            }
            var dbScheme = {};
            var diff = {};
            var stateId;
            prms = _loadState(stateId, function(scheme) {
                dbScheme = scheme;
                
            }).then(function() {//извлекает информацию о различиях и добавляет в базу новые таблицы и колонки
                diff = _difference(usrScheme, dbScheme);
                //TODO б) запрос модуля плагинс перегрузить приложение
                return _sync(driver_name, driver, diff.ormModels);
                
            }).then(function() {
                var uniq = new Date().getTime();
                stateId = m.cfg.path + '/migrations/'+uniq.toString()+".json";
                _saveState(stateId, diff.ormModels);
                
            }).then(function() {//magic
                if (magic)
                    return magic();
                    
            }).then(function() { //Удаляет таблицы и колонки //TODO удалить таблицы ненужных отношений 
                var pr;
                _.reduce(diff.rmModels, function(p, i) {//remove tables
                    pr = p.then(function() {
                        var df = Q.defer();
                        m.app.models[i].drop(function(err) {
                            if (err) {
                                console.log("<<< Drop Error: " + err);
                                df.reject();
                            }
                            console.log("<<< Drop " + i);
                            df.resolve();
                        });
                        return df.promise;
                    });
                    return pr;
                }, Q());
                if (pr) 
                    return pr;
                    
            }).then(function(){ // remove columns
                return _sync(driver_name, driver, usrScheme);

            }).then(function() {//save
                _saveState(stateId, usrScheme);
            });

            prms.done(function() {

            }, function() {

            });
            return prms;
        }
    };
}; 


