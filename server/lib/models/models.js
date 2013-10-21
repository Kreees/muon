var fs_ext = require(global.m.__sys_path+"/server/lib/utils/fs/fs_ext.js"),
    db_drive = require(global.m.__sys_path+"/server/lib/utils/db/database.js"),
    rest = require(global.m.__sys_path+"/server/lib/controllers/rest.js"),
    Q = require("q"),
    _ = require("underscore"),
    fs = require("fs")
;

var surrogate = function(name,descr){
    var model = function(obj){
        this.attributes = {};
        if ('object' == typeof obj)
            this.set(obj);
    };
    _.extend(model,descr);
    model.scheme = descr.attrs || {};
    model.model = model;
    model.model_name = name;
    model.prototype.model = model;
    model.prototype.model_name = name;
    return model;
}

function mod_path(mod_name,pref){
    pref = pref || "";
    var name = mod_name.substring(0,mod_name.lastIndexOf("."));
    if (name == mod_name) name = "";
    else name = name.replace(/\./g,"/") + "/";
    mod_name = mod_name.substr(mod_name.lastIndexOf(".")+1,mod_name.length)+".js";
    return pref+name+mod_name;
}

module.exports = {
    init: function(cfg){
        var dfd = Q.defer();
        cfg = cfg || global.m.cfg;
        var models_path = cfg.path+"/server/app/models";
        var plugin_scope = {}
        fs_ext.tree(models_path,function(files){
            plugin_scope.models = {};
            plugin_scope.model_names = [];
            plugin_scope.url_access = {};
            for(var i in files){
                var pack_path = files[i].replace(models_path+"/","");
                var file_name = pack_path.substring(pack_path.lastIndexOf("/")+1,pack_path.length).replace(/\.js$/g,"");
                pack_path = pack_path.replace(file_name+".js","").replace(/^\/|\/$/,"").replace(/\//g,".");
                var _model = require(files[i]);
                var _sch = _model.attrs || {};
                var model_simple_name = _model.model_name || file_name;
                var name = (pack_path?pack_path+".":"")+model_simple_name;
                // замещаем модель правильной функцией
                var model = surrogate(name,_model);

                // добавляем функции базы данных
                db_drive.extend(model);
                model.plugin_name = cfg.name;
                model.plugin_cfg = cfg;
                model.prototype.url = function() { return model.url+"/"+this.id.toString(); }
                // объявляем глобально
                plugin_scope.models[model.model_name] = model;
                plugin_scope.model_names.push(model.model_name);

                // если модель имеет публичный url указываем путь для поиска
                model.permissions = _model.permissions || ["all"];
                if (model.url !== false) {
                    if ('string' == typeof model.url) plugin_scope.url_access[model.url] = model;
                    else{
                        plugin_scope.url_access[model.model_name] = model;
                        model.url = model.model_name;
                    }
                }
            }

            var cdir_pref = cfg.path+"/server/app/controllers/";
            for(var i in plugin_scope.models){
                var model = plugin_scope.models[i];
                var name = model.model_name;
                model.s = {};
                model.o = {};
                model.d = {};
                model.m = {};
                // задаем контроллер для модели
                // Если точного соответствия имени файла контроллера и имени модели нет
                // то пытаемся подняться на ступень выше и взять контроллер на ступень выше.
                // Это обеспечит условное наследование моделей.
                // Если ниодного контроллера нет - то фолбечимся до обычного реста
                try {
                    var c_name = name;
                    while(!fs.existsSync(mod_path(c_name,cdir_pref))) {
                        var _c_name = c_name.substring(0,c_name.lastIndexOf("."));
                        if (_c_name == c_name) throw Error();
                        c_name = _c_name;
                    }
                    model.c = require(mod_path(c_name,cdir_pref));
                }
                catch(e) {
                    m.log(e);
                    model.c = rest;
                }
                if (typeof model.c.actions != "object") model.c.actions = {}
                if (typeof model.c.extend != "function") model.c.extend = rest.extend;
                // Выполняем привязку скоупов для моделей. Им
                m.super = model.c;
                for(var i in model.scopes){
                    var scope_name = model.scopes[i];
                    var c = null;
                    if ('string' == typeof scope_name){
                        try {c = require(cdir_pref+name.replace(/\./g,"/")+"/"+scope_name+".js");}
                        catch(e){m.kill("No controller for scope '"+scope_name+"' found for "+name+"! Exit.");}
                    }
                    else {
                        var scope_obj = scope_name;
                        c = model.c.extend(scope_obj);
                        scope_name = scope_obj.name;
                    }
                    /**
                     * TODO Решить вопрос со скоупом - это должен быть самостоятельнй класс
                     */
                    var scope = function(){
//                        return ('function' == typeof scope_func.c.get)?scope_func.c.get():scope_func.c.index()
                    };
                    model.s[scope_name] = scope;
                    scope.c = c;
                    if (typeof scope.c.actions != "object") scope.c.actions = {}
                    scope.model = model;
                    scope.model_name = model.model_name;
                    scope.scope_name = scope_name;
                }

                for(var i in model.objects){
                    var object_name = model.objects[i];
                    var c = null;
                    if ('string' == typeof object_name){
                        try {c = require(cdir_pref+name.replace(/\./g,"/")+"/"+object_name+".js");}
                        catch(e){m.kill("No controller for scope '"+object_name+"' found for "+name+"! Exit.");}
                    }
                    else {
                        var object_obj = object_name;
                        c = model.c.extend(object_obj);
                        object_obj = object_obj.name;
                    }
                    /**
                     * TODO Решить вопрос со скоупом - это должен быть самостоятельнй класс
                     */
                    var object = function(){
//                        return ('function' == typeof scope_func.c.get)?scope_func.c.get():scope_func.c.index()
                    };
                    model.o[object_name] = object;
                    object.c = c;
                    if (typeof object.c.actions != "object") object.c.actions = {}
                    object.model = model;
                    object.model_name = model.model_name;
                    object.object_name = object_name;
                }
                delete m.super;
            }

            var mdir_pref = cfg.path+"/server/app/middleware/";
            for(var i in plugin_scope.models){
                var model = plugin_scope.models[i];
                try {model.m = require(mod_path(i,mdir_pref));}
                catch(e){}
            }

            var models = plugin_scope.model_names.slice();
            var idir_pref = cfg.path + "/server/app/initialisers/";
            function init_models(){
                if (models.length == 0) return dfd.resolve(plugin_scope);
                var name = models.shift();
                try {
                    var f = require(mod_path(name,idir_pref)).apply(plugin_scope.models[name],[cfg,init_models]);
                    if (!f) return;
                    if (f.__proto__ = dfd.promise.__proto__) f.then(init_models);
                    else {
                        console.log("Initializer should return void or Q thenable object: "+name);
                        return;
                    }
                }
                catch(e){
                    init_models();
                }
            }
            init_models();
        });
        return dfd.promise;
    }

}