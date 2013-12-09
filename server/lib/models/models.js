var fsExt = require(global.m.__sys_path+"/server/lib/utils/fs/fs_ext.js"),
    dbDriver = require(global.m.__sys_path+"/server/lib/utils/db/database.js"),
    rest = require(global.m.__sys_path+"/server/lib/controllers/rest.js"),
    Q = require("q"),
    _ = require("underscore"),
    fs = require("fs")
;



var surrogate = function(name,descr){
    if (descr.extends){
        if (descr.attrs){
            for(var i in descr.super.attrs) {
                if (i in descr.attrs) m.kill("It's not allowed to override extended model attributes. Exiting.");
                else {
                    descr.attrs[i] = descr.super.attrs[i];
                }
            }
        }
        else {
            descr.attrs = descr.super.attrs;
        }
    }
    var model = function Model(obj){
	    this.attributes = {};
	    if ('object' == typeof obj)
	        this.set(obj);
	};
    _.extend(model,descr);
    for(var i in descr.attrs){
        if (!descr.attrs[i].type) m.kill("Model attribute type is not specified: "+model.modelName+" : "+i);
    }
    model.scheme = descr.attrs || {};
    model.object_list = descr.objects;
    model.scope_list = descr.scopes;
    model.objects = {};
    model.scopes = {};
    model.model = model;
    model.modelName = name;
    model.prototype.model = model;
    model.prototype.modelName = name;

    if (descr.super){
        (descr.super.object_list instanceof Array) && (model.object_list = descr.super.object_list.concat(model.object_list || []));
        (descr.super.scope_list instanceof Array) && (model.scope_list = descr.super.scope_list.concat(model.scope_list || []));
    }
    return model;
}

function modelFilePath(modelName,pref){
    pref = pref || "";
    var name = modelName.substring(0,modelName.lastIndexOf("."));
    if (name == modelName) name = "";
    else name = name.replace(/\./g,"/") + "/";
    modelName = modelName.substr(modelName.lastIndexOf(".")+1,modelName.length)+".js";
    return pref + name + modelName;
}

module.exports = {
    init: function(cfg){
        var dfd = Q.defer();
        cfg = cfg || global.m.cfg;
        var modelsPath = cfg.path+"/server/app/models";

        fsExt.tree(modelsPath,function(files){
            var pluginScope = {}
            var initOrder = [];
            pluginScope.models = {};
            pluginScope.modelNames = [];
            pluginScope.urlAccess = {};

            var modelDependencies = [];
            var dependencyFree = true;
            function initModelObject(filePath){
                var packagePath = filePath.replace(modelsPath+"/","");
                var fileName = packagePath.substring(packagePath.lastIndexOf("/")+1,packagePath.length).replace(/\.js$/g,"");
                packagePath = packagePath.replace(fileName+".js","").replace(/^\/|\/$/,"").replace(/\//g,".");
                var _model = require(filePath);
                var modelSimpleName = _model.modelName || fileName;
                var name = (packagePath?packagePath+".":"")+modelSimpleName;

                // ищем зависимость на расширение
                if (_model.extends) {
                    if (_model.extends.indexOf(":") != -1){
                        var dependencyFullName = (cfg.name?cfg.name+":":"")+_model.extends;
                        var subPlugin = dependencyFullName.split(":");
                        var modelName = subPlugin.pop(); subPlugin = subPlugin.join(":");
                        if (m.__plugins[subPlugin] && m.__plugins[subPlugin].models[modelName])
                            _model.super = m.__plugins[subPlugin].models[modelName];
                        else m.kill("No such model: "+dependencyFullName+". Dependency from model: "+name);
                    }
                    else {
                        if (pluginScope.modelNames.indexOf(_model.extends) == -1){
                            dependencyFree && modelDependencies.push(filePath);
                            return false;
                        }
                        _model.super = pluginScope.models[_model.extends];
                    }
                }

                // замещаем модель правильной функцией

                var model = surrogate(name,_model);

                // добавляем функции базы данных
                initOrder.push(name);
                dbDriver.extend(model);
                model.pluginName = cfg.name;
                model.pluginCfg = cfg;
                //* Не определено
//                model.prototype.url = function() { return model.url+"/"+this.id.toString(); }
                // объявляем глобально
                pluginScope.models[model.modelName] = model;
                pluginScope.modelNames.push(model.modelName);

                // если модель имеет публичный url указываем путь для поиска
                if (model.url !== false) {
                    if ('string' == typeof model.url) pluginScope.urlAccess[model.url] = model;
                    else{
                        pluginScope.urlAccess[model.modelName] = model;
                        model.url = model.modelName;
                    }
                }
                return true;
            }

            for(var i in files) initModelObject(files[i]);

            var i  = 0;
            dependencyFree = false;
            while(modelDependencies.length != 0){
                if (initModelObject(modelDependencies[i])){
                    modelDependencies.shift();
                    continue;
                }
                i++;
                if (i >= modelDependencies.length)
                    m.kill("Cyclic models dependency detected. Exiting.");
            }

            var controllersPath = cfg.path+"/server/app/controllers/";
            for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){
                var model = pluginScope.models[initOrder[modelIndex]];
                var name = model.modelName;

                model.scopes = {};
                model.objects = {};
                model.middleware = {};

                // задаем контроллер для модели
                // Если точного соответствия имени файла контроллера и имени модели нет
                // то пытаемся подняться на ступень выше и взять контроллер на ступень выше.
                // Это обеспечит условное наследование моделей.
                // Если ниодного контроллера нет - то фолбечимся до обычного реста
                if (model.super) m.super = model.super.controller;
                else m.super = rest;
                var sup = m.super;
                m.super = _.clone(m.super);
                m.super.super = sup;
                try {
                    var controllerName = name;
                    while(!fs.existsSync(modelFilePath(controllerName,controllersPath))) {
                        var _controllerName = controllerName.substring(0,controllerName.lastIndexOf("."));
                        if (_controllerName == controllerName) throw Error();
                        controllerName = _controllerName;
                    }
                    model.controller = require(modelFilePath(controllerName,controllersPath));
                    model.controller.pluginName = cfg.name;
                }
                catch(e) {
                    model.controller = m.super;
                }
                if (typeof model.controller.actions != "object") model.controller.actions = {}
                if (typeof model.controller.extend != "function") model.controller.extend = rest.extend;
                // Выполняем привязку скоупов для моделей. Им

                for(var i in model.scope_list){
                    var scopeName = model.scope_list[i];
                    if (model.super && model.super.scopes[scopeName]) m.super = model.super.scopes[scopeName].controller;
                    else m.super = model.controller;
                    var sup = m.super;
                    m.super = _.clone(m.super);
                    m.super.super = sup;

                    var controller;
                    if ('string' == typeof scopeName){
                        try {
                            controller = require(controllersPath+name.replace(/\./g,"/")+"/"+scopeName+".js");
                            controller.pluginName = cfg.name;
                        }
                        catch(e){
                            if (model.super) controller = m.super;
                            else m.kill("No controller for scope '"+scopeName+"' found for "+name+"! Exit.");
                        }
                    }
                    else m.kill("Syntax error. Scopes should be an array of strings! Exit.");
                    /**
                     * TODO Решить вопрос со скоупом - это должен быть самостоятельнй класс
                     */
                    var scope = function ModelScope(){}


                    model.s[scopeName] = scope;
                    scope.controller = controller;
                    if (typeof scope.controller.actions != "object") scope.controller.actions = {}
                    scope.model = model;
                    scope.modelName = model.modelName;
                    scope.scopeName = scopeName;
                }

                for(var i in model.object_list){
                    var objectName = model.object_list[i];

                    if (model.super && model.super.objects[objectName]) m.super = model.super.objects[objectName].controller;
                    else m.super = model.controller;
                    var sup = m.super;
                    m.super = _.clone(m.super);
                    m.super.super = sup;

                    var controller = null;
                    if ('string' == typeof objectName){
                        try {
                            controller = require(controllersPath+name.replace(/\./g,"/")+"/"+objectName+".js");
                            controller.pluginName = cfg.name;
                        }
                        catch(e){
                            if (model.super) controller = m.super;
                            else m.kill("No controller for object '"+objectName+"' found for "+name+"! Exit.");
                        }
                    }
                    else m.kill("Syntax error. Objects should be an array of strings! Exit.");
                    /**
                     * TODO Решить вопрос с объектами - это должен быть самостоятельнй класс
                     */
                    var object = function ModelObject(){}

                    model.objects[objectName] = object;
                    object.controller = controller;
                    if (typeof object.controller.actions != "object") object.controller.actions = {}
                    object.model = model;
                    object.modelName = model.modelName;
                    object.objectName = objectName;
                }
                delete m.super;
            }

            var middlewarePath = cfg.path+"/server/app/middleware/";
            for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){
                var model = pluginScope.models[initOrder[modelIndex]];
                try {
                    model.middleware = require(modelFilePath(initOrder[modelIndex],middlewarePath));
                }
                catch(e){}
            }

            var models = pluginScope.modelNames.slice();
            var initialisersPath = cfg.path + "/server/app/initialisers/";

            function initModels(){
                if (models.length == 0){
                    return dfd.resolve(pluginScope);
                }
                var name = models.shift();
                try {
                    var f = require(modelFilePath(name,initialisersPath)).apply(pluginScope.models[name],[cfg,initModels]);
                    if (!f) return;
                    if (f.__proto__ = dfd.promise.__proto__) f.then(initModels);
                    else {
                        console.log("Initializer should return void or Q thenable object: "+name);
                        return;
                    }
                }
                catch(e){
                    initModels();
                }
            }
            initModels();
        });
        return dfd.promise;
    }

}