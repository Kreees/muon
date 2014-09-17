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
    var compare = self.require('lib/difference');
    var getMyModelsScheme = self.require('lib/getAppScheme');
    var Q = require('q');
    var _ = require('underscore');
    
    var initCommon = self.require("lib/init");
    var dbg = true;
    // флаг вывода информации в лог
    self.flagStop = false;
    
    function mydbg(obj){
        if(dbg) console.log(obj);
    }

    return {
        __init__ : function() {
            var prms = initCommon().then(function() {
                return self.MState.lastState();
            }).then(function(last) {
                if (last.err) 
                    mydbg("  Last migration state has an error: " + last.err);
                if (!last.isSynced() && last.getId()) return Q(last);
                return self.MState.createState().then(function(stt) {
                    stt.setScheme(last.getScheme());
                    if (last.getId())
                        stt.downStateId = last.getId();
                    return Q(stt);
                });
//models                
            }).then(function(syncingS){
                var diff = compare(syncingS.scheme, getMyModelsScheme());
                m.diff = diff;
                if (!diff.need) {
                    mydbg("  Nothing to sync.");
                    return Q();
                }
                if (_.keys(diff.err).length != 0) {
                    mydbg("  Migration not able.");
                    for (var db in diff.err) {
                        mydbg("    Database: " + db);
                        for (var i in diff.err[db]) {
                            mydbg("    " + diff.err[db][i]);
                        }
                    }
                    return Q.reject("Migration not able.");
                }
                syncingS.loadMagic();
                return Q();
            });

            prms.done(function(obj) {
                m.emit("migrate-ready");
            }, function(err) {
                // self.flagStop = true;
                mydbg('Reject with: ' + err);
                // process.exit();
            });
            return prms;
        },
        info : self.require('lib/info'),
        migrate : function(forced) {
            m.me = this;
            var syncingS;
            var prms = Q();
            
//options
            mydbg("---Migrate:");
//load Last   
            prms = prms.then(function() {
                return self.MState.lastState();
            }).then(function(last) {
                if (last.err) 
                    mydbg("  Last migration state has an error: " + last.err);
                if (!last.isSynced() && last.getId()) return Q(last);
                return self.MState.createState().then(function(stt) {
                    stt.setScheme(last.getScheme());
                    if (last.getId())
                        stt.downStateId = last.getId();
                    return Q(stt);
                });
//models
            }).then(function(sst){
                syncingS = sst;
                
                var schemeTo = getMyModelsScheme();
                if(!schemeTo) return Q.reject("Migrate err: no scheme to sync with.");
                var diff = compare(syncingS.scheme, schemeTo);
                m.diff = diff;
                if (!diff.need) {
                    mydbg("  Nothing to sync.");
                    return Q();
                }
                if (_.keys(diff.err).length != 0 && !forced) {
                    mydbg("  Migration not able.");
                    for (var db in diff.err) {
                        mydbg("    Database: " + db);
                        for (var i in diff.err[db]) {
                            mydbg("    " + diff.err[db][i]);
                        }
                    }
                    return Q.reject("Migration not able.");
                }
                if(forced) return syncingS.synchronize(diff, true);
                return syncingS.synchronize(diff);
/// plugins                
            }).then(function(){
                
                
            }).then(function(){
                 mydbg("---------------------------.");
            });

            prms.done(function() {
                m.emit("migrate-run-ready");
                // process.exit();
            }, function(err) {
                mydbg("Reject with: " + err);
                mydbg("----r--e--j--e--c--t--e--d---------.");
                
            });
            return prms;
        }
    };
};

