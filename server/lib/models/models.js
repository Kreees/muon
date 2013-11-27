var fs_ext = require(global.m.__sys_path+"/server/lib/utils/fs/fs_ext.js"),
    db_drive = require(global.m.__sys_path+"/server/lib/utils/db/database.js"),
    rest = require(global.m.__sys_path+"/server/lib/controllers/rest.js"),
    Q = require("q"),
    _ = require("underscore"),
    fs = require("fs")
;



var surrogate = function(name,descr){
    if (descr.extend && descr.attrs){
        m.kill("It's not allowed to override extended model attributes");
    }
    var model = function Model(obj){
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
    if (descr.super){
        model.scheme = descr.super.scheme;
        (descr.super.objects instanceof Array) && (model.objects = descr.super.objects.concat(model.objects || []));
        (descr.super.scopes instanceof Array) && (model.scopes = descr.super.scopes.concat(model.scopes || []));
    }
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
        fs_ext.tree(models_path,function(files){
            var plugin_scope = {}
            var init_order = [];
            plugin_scope.models = {};
            plugin_scope.model_names = [];
            plugin_scope.url_access = {};

            var model_dependency = [];
            var dependency_free = true;
            function init_model_object(file_path){
                var pack_path = file_path.replace(models_path+"/","");
                var file_name = pack_path.substring(pack_path.lastIndexOf("/")+1,pack_path.length).replace(/\.js$/g,"");
                pack_path = pack_path.replace(file_name+".js","").replace(/^\/|\/$/,"").replace(/\//g,".");
                var _model = require(file_path);
                var model_simple_name = _model.model_name || file_name;
                var name = (pack_path?pack_path+".":"")+model_simple_name;

                // ищем зависимость на расширение
                if (_model.extend) {
                    if (_model.extend.indexOf(":") != -1){
                        var dep_full_name = (cfg.name?cfg.name+":":"")+_model.extend;
                        var sub_plugin = dep_full_name.split(":");
                        var model_name = sub_plugin.pop(); sub_plugin = sub_plugin.join(":");
                        if (m.__plugins[sub_plugin] && m.__plugins[sub_plugin].models[model_name])
                            _model.super = m.__plugins[sub_plugin].models[model_name];
                        else m.kill("No such model: "+dep_full_name+". Dependency from model: "+name);
                    }
                    else {
                        if (plugin_scope.model_names.indexOf(_model.extend) == -1){
                            dependency_free && model_dependency.push(file_path);
                            return false;
                        }
                        _model.super = plugin_scope.models[_model.extend];
                    }
                }

                // замещаем модель правильной функцией

                var model = surrogate(name,_model);

                // добавляем функции базы данных
                init_order.push(name);
                db_drive.extend(model);
                model.plugin_name = cfg.name;
                model.plugin_cfg = cfg;

                //* Не определено
//                model.prototype.url = function() { return model.url+"/"+this.id.toString(); }
                // объявляем глобально
                plugin_scope.models[model.model_name] = model;
                plugin_scope.model_names.push(model.model_name);

                // если модель имеет публичный url указываем путь для поиска
                if (model.url !== false) {
                    if ('string' == typeof model.url) plugin_scope.url_access[model.url] = model;
                    else{
                        plugin_scope.url_access[model.model_name] = model;
                        model.url = model.model_name;
                    }
                }
                return true;
            }

            for(var i in files) init_model_object(files[i]);

            var i  = 0;
            dependency_free = false;
            while(model_dependency.length != 0){
                if (init_model_object(model_dependency[i])){
                    model_dependency.shift();
                    continue;
                }
                i++;
                if (i >= model_dependency.length)
                    m.kill("Cyclic models dependency detected. Exiting.");
            }

            var cdir_pref = cfg.path+"/server/app/controllers/";
            for(var mod_index = 0, len = init_order.length; mod_index < len; mod_index++){
                var model = plugin_scope.models[init_order[mod_index]];
                var name = model.model_name;

                model.s = {};
                model.o = {};
                model.m = {};

                // задаем контроллер для модели
                // Если точного соответствия имени файла контроллера и имени модели нет
                // то пытаемся подняться на ступень выше и взять контроллер на ступень выше.
                // Это обеспечит условное наследование моделей.
                // Если ниодного контроллера нет - то фолбечимся до обычного реста
                if (model.super) m.super = model.super.c;
                else m.super = rest;
                try {
                    var c_name = name;
                    while(!fs.existsSync(mod_path(c_name,cdir_pref))) {
                        var _c_name = c_name.substring(0,c_name.lastIndexOf("."));
                        if (_c_name == c_name) throw Error();
                        c_name = _c_name;
                    }
                    model.c = require(mod_path(c_name,cdir_pref));
                    model.c.plugin_name = cfg.name;
                }
                catch(e) {
                    model.c = m.super;
                }
                if (typeof model.c.actions != "object") model.c.actions = {}
                if (typeof model.c.extend != "function") model.c.extend = rest.extend;
                // Выполняем привязку скоупов для моделей. Им

                if (model.super) m.super = model.super.c;
                else m.super = model.c;

                for(var i in model.scopes){
                    var scope_name = model.scopes[i];
                    var c = null;
                    if ('string' == typeof scope_name){
                        try {
                            c = require(cdir_pref+name.replace(/\./g,"/")+"/"+scope_name+".js");
                            c.plugin_name = cfg.name;
                        }
                        catch(e){
                            if (model.super) c = m.super;
                            else m.kill("No controller for scope '"+scope_name+"' found for "+name+"! Exit.");
                        }
                    }
                    else m.kill("Syntax error. Scopes should be an array of strings! Exit.");
                    /**
                     * TODO Решить вопрос со скоупом - это должен быть самостоятельнй класс
                     */
                    var scope = function ModelScope(){}


                    model.s[scope_name] = scope;
                    scope.c = c;
                    if (typeof scope.c.actions != "object") scope.c.actions = {}
                    scope.model = model;
                    scope.model_name = model.model_name;
                    scope.scope_name = scope_name;
                }

                for(var i in model.objects){
                    var object_name = model.objects[i];
                    if (model.super) m.super = model.super.c;
                    else m.super = model.c;
                    var c = null;
                    if ('string' == typeof object_name){
                        try {
                            c = require(cdir_pref+name.replace(/\./g,"/")+"/"+object_name+".js");
                            c.plugin_name = cfg.name;
                        }
                        catch(e){
                            if (model.super) c = m.super;
                            else m.kill("No controller for object '"+object_name+"' found for "+name+"! Exit.");
                        }
                    }
                    else m.kill("Syntax error. Objects should be an array of strings! Exit.");
                    /**
                     * TODO Решить вопрос с объектами - это должен быть самостоятельнй класс
                     */
                    var object = function ModelObject(){}

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
            for(var mod_index = 0, len = init_order.length; mod_index < len; mod_index++){
                var model = plugin_scope.models[init_order[mod_index]];
                try {
                    model.m = require(mod_path(init_order[mod_index],mdir_pref));
                }
                catch(e){}
            }

            var models = plugin_scope.model_names.slice();
            var idir_pref = cfg.path + "/server/app/initialisers/";

            function init_models(){
                if (models.length == 0){
                    return dfd.resolve(plugin_scope);
                }
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