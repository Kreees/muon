var fsExt = require(m.__syspath+"/lib/utils/fs/fs_ext.js"),
    dbDriver = require(m.__syspath+"/lib/utils/db/database.js"),
    rest = require(m.__syspath+"/lib/controllers/rest.js"),
    Q = require("q"),
    _ = require("underscore"),
    fs = require("fs")
;



var surrogate = function(name,descr){
    if (descr.extends){
        if (descr.attrs){
            for(var i in descr.super.attrs) {
                if (i in descr.attrs) m.kill("It's not allowed to override extended model attributes. Exiting.");
                else { descr.attrs[i] = descr.super.attrs[i]; }
            }
        }
        else { descr.attrs = descr.super.attrs; }
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
    model.objectsList = descr.objects;
    model.scopesList = descr.scopes;
    model.objects = {};
    model.scopes = {};
    model.dbName = descr.db || "default";
    model.model = model;
    model.modelName = name;
    model.prototype.model = model;
    model.prototype.modelName = name;

    if (descr.super){
        (descr.super.objectsList instanceof Array) && (model.objectsList = descr.super.objectsList.concat(model.objectsList || []));
        (descr.super.scopesList instanceof Array) && (model.scopesList = descr.super.scopesList.concat(model.scopesList || []));
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
            files = files.filter(function(file){ return !file.match(/\/_[a-zA-Z_\d\.]*/); });
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

                model.pluginName = cfg.name;
                model.pluginCfg = cfg;
                model.modulePath = filePath;
                dbDriver.extendModel(model);

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

            try {
            var controllersPath = cfg.path+"/server/app/controllers/";
            for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){

                var model = pluginScope.models[initOrder[modelIndex]];
                var name = model.modelName;
                // задаем контроллер для модели
                // Если точного соответствия имени файла контроллера и имени модели нет
                // то пытаемся подняться на ступень выше и взять контроллер на ступень выше.
                // Это обеспечит условное наследование моделей.
                // Если ниодного контроллера нет - то фолбечимся до обычного реста

                if (model.super) m.super = model.super.controller;
                else m.super = rest;

                var controller;
                try {
                    var controllerName = name;
                    while(!fs.existsSync(modelFilePath(controllerName,controllersPath))) {
                        var _controllerName = controllerName.substring(0,controllerName.lastIndexOf("."));
                        if (_controllerName == controllerName) throw Error();
                        controllerName = _controllerName;
                    }
                    try {
                        var cfilePath = modelFilePath(controllerName,controllersPath);
                        controller = require(cfilePath);
                        controller.modulePath = cfilePath;
                    }
                    catch(e) {m.kill(e);}
                }
                catch(e) {
                    controller = m.super;
                }

                if (typeof controller.extend != "function") controller.extend = rest.extend;

                model.controller = controller.extend({});
                model.controller.super = m.super;
                model.controller.pluginName = cfg.name;
                // Выполняем привязку скоупов для моделей. Им

                for(var i in model.scopesList){
                    var scopeName = model.scopesList[i];
                    if (model.super && model.super.scopes[scopeName])
                        m.super = model.super.scopes[scopeName].controller;
                    else m.super = model.controller;

                    var controller;
                    if ('string' == typeof scopeName){
                        if (!fs.existsSync(controllersPath+name.replace(/\./g,"/")+"/"+scopeName+".js"))
                            controller = m.super;
                        else
                            try {
                                var cfilePath = controllersPath+name.replace(/\./g,"/")+"/"+scopeName+".js"
                                controller = require(cfilePath);
                                controller.modulePath = cfilePath;
                            }
                            catch(e){ m.kill(e); }
                    }
                    else m.kill("Model definition error. Scopes should be an array of strings.");

                    if (typeof controller.extend != "function") controller.extend = rest.extend;

                    var scope = function ModelScope(){}
                    scope.controller = controller.extend({});
                    scope.controller.super = m.super;
                    scope.controller.pluginName = cfg.name;

                    scope.model = model;
                    scope.modelName = model.modelName;
                    scope.scopeName = scopeName;

                    model.scopes[scopeName] = scope;
                }
                for(var i in model.objectsList){
                    var objectName = model.objectsList[i];

                    if (model.super && model.super.objects[objectName])
                        m.super = model.super.objects[objectName].controller;
                    else m.super = model.controller;

                    var controller = null;
                    if ('string' == typeof objectName){
                        if (!fs.existsSync(controllersPath+name.replace(/\./g,"/")+"/"+objectName+".js"))
                            controller = m.super;
                        else
                            try {
                                var cfilePath = controllersPath+name.replace(/\./g,"/")+"/"+objectName+".js";
                                controller = require(cfilePath);
                                controller.modulePath = cfilePath;
                            }
                            catch(e){ m.kill(e); }
                    }
                    else m.kill("Model definition error. Objects should be an array of strings.");
                    if (typeof controller.extend != "function") controller.extend = rest.extend;


                    var object = function ModelObject(){}
                    object.controller = controller.extend({});
                    object.controller.super = m.super;
                    object.controller.pluginName = cfg.name;

                    object.model = model;
                    object.modelName = model.modelName;
                    object.objectName = objectName;
                    model.objects[objectName] = object;
                }
                delete m.super;
            }

            var middlewarePath = cfg.path+"/server/app/middleware/";
            for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){
                var model = pluginScope.models[initOrder[modelIndex]];
                if (!fs.existsSync(modelFilePath(initOrder[modelIndex],middlewarePath))) {
                    if (model.super) model.middleware = model.super.middleware;
                }
                else
                    try {
                        var mfilePath = modelFilePath(initOrder[modelIndex],middlewarePath);
                        controller = require(mfilePath);
                        controller.modulePath = mfilePath;
                    }
                    catch(e){m.kill(e);}
            }

            var models = pluginScope.modelNames.slice();
            var initialisersPath = cfg.path + "/server/app/initialisers/";

            }
            catch(e){
                m.kill(e);
            }
            function initModels(){
                if (models.length == 0){
                    return dfd.resolve(pluginScope);
                }
                var name = models.shift();
                try {
                    var f = require(modelFilePath(name,initialisersPath)).apply(pluginScope.models[name],[cfg,initModels]);
                    if (!f) return;
                    if (f.__proto__ = dfd.promise.__proto__) f.then(initModels).done();
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