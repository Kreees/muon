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
    var compareDescriptors = self.require('lib/difference');
    var getAppScheme = self.require('lib/getAppScheme');
    var Q = require('q');
    var _ = require('underscore');
    var g = require('grunt');
    var initCommon = self.require("lib/init");
    var dbg = true;
    // флаг вывода информации в лог
    self.flagStop = false;
    function loadMagic(id) {
        var mjcPath = self.mjcDir + id + ".js";
        var txt = "module.exports = function(){\n" + "return function(models) {\n" + "}\n" + "};\n";
        if (!g.file.exists(mjcPath)) {
            g.file.write(mjcPath, txt);
            if (dbg) {
                console.log("  Magic file created: " + mjcPath);
                console.log("  Complete file and run migration.migrate().");
            }
            return null;
        } else {
            var ret = require(mjcPath);
            if ( typeof ret === "function") {
                if (dbg)
                    console.log("  Magic is ok. File path: " + mjcPath);
                return ret;
            } else {
                if (dbg) {
                    console.log("  Magic is not a function. File path: " + mjcPath);
                    console.log("  Complete file and run migration.migrate().");
                }
                return null;
            }
        }
        return ret;
    };

    return {
        __init__ : function() {
            var prms = initCommon().then(function() {
                return self.MState.lastState();
            }).then(function(last) {
                var magic;
                if (!last.getId())// First migration
                    return Q();
                if (last.err)
                    return Q.reject("Last migration state error: " + last.err);
                if (last.isSynced())
                    magic = loadMagic(last.getId());
                else
                    if(last.magicId) magic = loadMagic(last.magicId);
                return Q();
            });

            prms.done(function(obj) {
                m.emit("migrate-ready");
            }, function(err) {
                // self.flagStop = true;
                console.log('Reject with: ' + err);
                // process.exit();
            });
            return prms;
        },
        migrate : function(id) {
            // if (self.flagStop)
                // Q.reject("Migrate function is denied.");
            var prms = Q();
            var diff;
            var syncingState;
            var schemeTo;
            var magic;
            var prms = Q();
            if (dbg)
                console.log("---Migrate:");
            if ( typeof id === 'number') {
                prms = self.MState.getState(id).then(function(state) {// if no state - reject
                    schemeTo = state.scheme;
                    if (dbg)
                        console.log("  Migrate to state with id = " + id);
                });
            } else {
                if (dbg)
                    console.log("  Migrate to application scheme.");
                schemeTo = getAppScheme();
            }
            prms = prms.then(function() {
                return self.MState.lastState();
            }).then(function(last) {
                if (last.err) {
                    if (dbg)
                        console.log("  Last migration state has an error: " + last.err);
                }
                diff = compareDescriptors(last.scheme, schemeTo);
                m.diff = diff;
                if (!diff.need) {
                    if (dbg)
                        console.log("  Nothing to sync.");
                    if(last.isSynced()) return Q.reject("Nothing to sync.");
                }
                if (_.keys(diff.err).length != 0) {
                    if (dbg) {
                        console.log("  Migration not able. Scheme changes:");
                        for (var db in diff.err) {
                            console.log("    Database - " + db + " :");
                            for (var i in diff.err[db]) {
                                console.log("    " + diff.err[db][i]);
                            }
                        }
                    }
                    return Q.reject("Migration not able.");
                }
                if (!last.isSynced() && last.getId()) {
                    if(last.magicId) 
                        magic = loadMagic(last.magicId);
                    if (!magic)
                        return Q.reject("Magic file not complete.");
                    if (dbg)
                        console.log("  Continue syncing last migration state.");
                    return Q(last);
                } else {
                    if(last.getId()){
                        magic = loadMagic(last.getId());
                        if (!magic)
                            return Q.reject("Magic file not complete.");
                    } 
                    return self.MState.createState().then(function(stt) {
                        stt.setScheme(last.getScheme());
                        stt.downStateId = last.getId();
                        return Q(stt);
                    });
                }
            }).then(function(stt) {// ddl sync app models; add attributes
                syncingState = stt;
                if (_.keys(diff.addAttr).length == 0 && _.keys(diff.addModel).length == 0)
                    return Q();
                if (dbg)
                    console.log("  ddl sync extended last scheme (adding models and attributes) ... ");
                return syncingState.ddlSync(diff.ddlSyncExt);

            }).then(function() {// new app scope
                return deps.plugins.reloadScope(diff.extScope);

            }).then(function() {// orm sync
                // if(_.keys(diff.addManyA).length == 0 ) return Q();
                if (dbg)
                    console.log("  Orm syncing app databases ... ");
                var p = Q();
                _.each(schemeTo, function(dscr, dbname) {
                    p = p.then(function() {
                        return deps.database.getDatabase(dbname).then(function(db) {
                            var df = Q.defer();
                            db.sync(function(err) {
                                if (err)
                                    df.reject(err);
                                else {
                                    df.resolve();
                                    if (dbg)
                                        console.log("    Db: " + dbname + " synced.");
                                }

                            });
                            return df.promise;
                        });
                    });
                });
                return p;

            }).then(function() {// magic
                if (!syncingState.downStateId)
                    return Q();
                if (dbg)
                    console.log("  Magic ... ");
                if (typeof magic === 'function')
                    return magic();
                else
                    return Q.reject("No magic function");
            }).then(function() {
                if (_.keys(diff.rmAttr).length == 0)
                    return Q();
                if (dbg)
                    console.log("Removing models attributes ... ");
                return syncingState.ddlSync(diff.ddlSyncRm);

            }).then(function() {//TODO when ready reloadScope
                return Q();
                if (_.keys(diff.rmModel).length == 0)
                    return Q();
                if (dbg)
                    console.log("Removing models ... ");
                function one(name) {
                    var df = Q.defer();
                    m.app.models[name].drop(function(err) {
                        if (err) {
                            df.reject(err);
                        } else {
                            if (dbg)
                                console.log("Model " + name + " removed.");
                            df.resolve();
                        }
                    });
                    return df.promise;
                }

                var _p = Q();
                for (var db in diff.rmModel) {
                    var dscr = diff.rmModel[db];
                    _.each(dscr, function(dsc, mdl) {
                        _p = _p.then(function() {
                            return one(mdl);
                        }).then(function() {
                            delete dscr[mdl];
                            return Q();
                        });
                    });
                    _p = _p.then(function() {
                        syncingState.changeDescriptor(db, dscr);
                        return syncingState.save();
                    });
                }
                return _p;
            }).then(function() {
                if (dbg)
                    console.log("---------------------------.");
                return syncingState.save(null, true);
            });

            prms.done(function() {
                m.emit("migrate-run-ready");
                // process.exit();
            }, function(err) {
                if (dbg)
                    console.log("Reject with: " + err);
                if (err && syncingState) syncingState.save(err);
            });
            return prms;
        },
        info : self.require('lib/info'),
        sync : function(id, force) {
            if (dbg)
                console.log("---Sync:");
            if (force && dbg)
                console.log("  !!! Ignore scheme difference !!!");
            var syncingState;
            var currentState;
            var schemeTo;
            var prms = Q();
            if ( typeof id === 'number') {
                prms = self.MState.getState(id).then(function(state) {// if no state - reject
                    schemeTo = state.scheme;
                    if (dbg)
                        console.log("  Migrate to state with id = " + id);
                });
            } else {
                if (dbg)
                    console.log("  Migrate to application scheme.");
                schemeTo = getAppScheme();
            }
            prms = prms.then(function() {
                return self.MState.lastState();
            }).then(function(last) {
                if (last.err) {
                    if (dbg)
                        console.log("  Last migration state has an error: " + last.err);
                }
                var diff = compareDescriptors(last.scheme, schemeTo);
                m.diff = diff;
                if (!diff.need && !force) {
                    if (dbg)
                        console.log("  Nothing to sync.");
                    return Q.reject("Nothing to sync.");
                }
                if (!last.isSynced()) {
                    if (dbg)
                        console.log("  Continue syncing last migration state.");
                    return Q(last);
                } else {
                    return self.MState.createState().then(function(stt) {
                        console.log("2");
                        stt.setScheme(last.getScheme());
                        stt.downStateId = last.getId();
                        return Q(stt);
                    });
                }
            }).then(function(stt) {// ddl sync app models
                syncingState = stt;
                syncingState.forced = true;
                if (dbg)
                    console.log("DDL syncing ... ");
                return syncingState.ddlSync(schemeTo);

            }).then(function() {// orm sync databases (all models at once)
                var p = Q();
                _.each(schemeTo, function(dscr, dbname) {
                    p = p.then(function() {
                        return deps.database.getDatabase(dbname).then(function(db) {
                            var df = Q.defer();
                            db.sync(function(err) {
                                if (err)
                                    df.reject(err);
                                else {
                                    df.resolve();
                                    if (dbg)
                                        console.log("Db: " + dbname + " synced.");
                                }

                            });
                            return df.promise;
                        });
                    });
                });
                return p;

            }).then(function(){
                syncingState.save(null, true);
                if(dbg) console.log("-------------------.");
            });
            
            prms.done(function(){}, function(err) {
                if (dbg)
                    console.log(" Reject with: " + err);
                if (err && syncingState) syncingState.save(err);
            });
            return prms;
        }
    };
};

