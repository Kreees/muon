var fsExt = require(m.__syspath+"/lib/utils/fs/fs_ext.js"),
    rest = require(m.__syspath+"/lib/controllers/rest.js"),
    path = require("path"),
    Q = require("q"),
    _ = require("underscore"),
    fs = require("fs")
;

function getModel(name,plName){
    var thisPluginName = plName || (this.cfg?this.cfg.name:"");
    if (name.indexOf(":") != -1){
        var dependencyFullName = (thisPluginName?thisPluginName+":":"")+name;
        var subPlugin = dependencyFullName.split(":");
        var modelName = subPlugin.pop(); subPlugin = subPlugin.join(":");
        if (!m.__plugins[subPlugin]) throw Error("Plugin does not exist: "+subPlugin);
        return m.__plugins[subPlugin].models[modelName];
    }
    else {
        if (this.models) return this.models[name]
        else return m.models[name];
    }
}

function normalizeDescription(name,plugin,descr){
    descr = m._.clone(descr || {});
    if (descr.extends){
        if (descr.attributes){
            for(var i in descr.super.attributes) {
                if (i in descr.attributes) m.kill("It's not allowed to override extended model attributes. Exiting.");
                else { descr.attributes[i] = descr.super.attributes[i]; }
            }
        }
        else { descr.attributes = descr.super.attributes; }
    }

    var model = _.extend({},descr);

    model.hasOne = descr.hasOne || {};
    model.hasMany = descr.hasMany || {};
    model.attributes = descr.attributes || {};
    model.modelName = name;
    model.pluginName = plugin;
    model.fullName = ((plugin?plugin+":":"")+name);

    model.validations = descr.validations || {};
    model.methods = descr.methods || {};
    model.hooks = descr.hooks || {};
    model.id = descr.id || ["_id"];
    model.idName = model.id;

    model.url = descr.url;

    model.objectsList = descr.objects || [];
    if (descr.super) model.objectsList = m._.keys(descr.super.objects).concat(model.objectsList || []);
    model.objects = {};

    model.scopesList = descr.scopes || [];
    if (descr.super) model.scopesList = m._.keys(descr.super.objects).concat(model.scopesList || []);
    model.scopes = {};

    model.db = descr.db || descr.dbName || "default";
    model.dbName = model.db;
    model.collection = descr.collection || descr.table || model.fullName.replace(/[:\.]/g,"_");
    model.collectionName = model.collection;

    model.methods = descr.methods;

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

var descriptors = {};

module.exports = {
    getModel: getModel,
    init: function(cfg){
        var dfd = Q.defer();
        cfg = cfg || global.m.cfg;
        var modelsPath = path.normalize(cfg.path+"/server/app/models");
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
                _model = normalizeDescription(name,cfg.name,_model);

                // добавляем функции базы данных
                initOrder.push(name);

                if (!(_model.dbName in m.databases))
                    m.kill("Database '"+_model.dbName+"' is not defined. Reference model is '"+_model.fullName+"'");
                try {
                    var model = m.databases[_model.dbName].define(_model.fullName,_model.attributes,{
                        "methods": _model.methods,
                        "validations": _model.validations,
                        "hooks": _model.hooks,
                        "fullName": _model.fullName,
                        "modelName": _model.modelName
                    });
                }
                catch(e){
                    m.log("Model init error: "+ _model.modelName);
                    m.log(e);
                    process.exit();
                }

                model.modelName = _model.modelName;

                descriptors[model.modelName] = _model;

                model.model = model;
                model.prototype.model = model;
                model.modulePath = path.normalize(filePath);
                model.prototype.url = function() { return model.url+"/"+this.id.toString(); }
                model.scopes = {};
                model.objects = {};

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

            // Assigning relations

                for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){
                    var model = pluginScope.models[initOrder[modelIndex]];
                    var hasOne = descriptors[model.modelName].hasOne
                    if (typeof hasOne != "object") continue;
                    var hasOneKeys = m._.keys(hasOne)
                    for(var i = 0, len = hasOneKeys.length; i < len; i++){
                        var key = hasOneKeys[i], descr = hasOne[key];
                        var refModel,refDescr = {};
                        if (typeof descr == "string") refModel = getModel(descr,cfg.name)
                        else {
                            if (!(descr.model || descr.type)) m.kill("Model hasOne property descriptor must contain 'model' or 'type' attribute referenced to other model. Model: "+model.modelName);
                            refModel = getModel(descr.model || descr.type,cfg.name)
                            delete descr.model;
                            delete descr.type;
                            refDescr = descr;
                        }
                        model.hasOne(key,refModel,refDescr);
                    }
                }

                for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){
                    var model = pluginScope.models[initOrder[modelIndex]];
                    var hasMany = descriptors[model.modelName].hasMany;
                    if (typeof hasMany != "object") continue;
                    var hasManyKeys = m._.keys(hasMany)
                    for(var i = 0, len = hasManyKeys.length; i < len; i++){
                        var key = hasManyKeys[i], descr = hasMany[key];

                        var refModel,refDescr = {};
                        if (typeof descr == "string") refModel = getModel(descr,cfg.name)
                        else {
                            if (!(descr.model || descr.type)) m.kill("Model hasMany property descriptor must contain 'model' or 'type' attribute referenced to other model. Model: "+ model.modelName);
                            refModel = getModel(descr.model || descr.type,cfg.name)
                            delete descr.model;
                            delete descr.type;
                            refDescr = descr;
                        }
                        model.hasMany(key,refModel,refDescr);
                    }
                }

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
                            var cfilePath = path.normalize(modelFilePath(controllerName,controllersPath));
                            controller = require(cfilePath);
                            controller.modulePath = cfilePath;
                        }
                        catch(e) {m.kill(e);}
                    }
                    catch(e) {
                        controller = m.super;
                    }

                    controller.extend = rest.extend;
                    model.controller = controller.extend({});
                    model.controller.super = m.super;
                    model.controller.pluginName = cfg.name;
                    model.controller.permissions = model.controller.permissions || ["all"];
                    model.controller.dependencies = model.controller.dependencies || [];
                    model.controller.actions = model.controller.actions || {};

                    // Выполняем привязку скоупов для моделей. Им

                    for(var i in descriptors[model.modelName].scopesList){
                        var scopeName = descriptors[model.modelName].scopesList[i];
                        var scope = function ModelScope(){}

                        if (model.super && model.super.scopes[scopeName])
                            m.super = model.super.scopes[scopeName].controller;
                        else m.super = model.controller;

                        var controller;
                        if ('string' == typeof scopeName){
                            if (!fs.existsSync(controllersPath+name.replace(/\./g,"/")+"/"+scopeName+".js"))
                                controller = m.super;
                            else
                                try {
                                    var cfilePath = path.normalize(controllersPath+name.replace(/\./g,"/")+"/"+scopeName+".js");
                                    controller = require(cfilePath);
                                    controller.modulePath = cfilePath;
                                }
                                catch(e){ m.kill(e); }
                        }
                        else m.kill("Model definition error. Scopes should be an array of strings.");

                        if (typeof controller.extend != "function") controller.extend = rest.extend;



                        controller.extend = rest.extend;
                        scope.controller = controller.extend({});
                        scope.controller.super = m.super;
                        scope.controller.pluginName = cfg.name;
                        scope.controller.permissions = scope.controller.permissions || ["all"];
                        scope.controller.dependencies = scope.controller.dependencies || [];
                        scope.controller.actions = scope.controller.actions || {};

                        scope.model = model;
                        scope.modelName = model.modelName;
                        scope.scopeName = scopeName;

                        model.scopes[scopeName] = scope;
                    }
                    for(var i in descriptors[model.modelName].objectsList){
                        var objectName = descriptors[model.modelName].objectsList[i];
                        var object = function ModelObject(){}

                        if (model.super && model.super.objects[objectName])
                            m.super = model.super.objects[objectName].controller;
                        else m.super = model.controller;

                        var controller = null;
                        if ('string' == typeof objectName){
                            if (!fs.existsSync(controllersPath+name.replace(/\./g,"/")+"/"+objectName+".js"))
                                controller = m.super;
                            else
                                try {
                                    var cfilePath = path.normalize(controllersPath+name.replace(/\./g,"/")+"/"+objectName+".js");
                                    controller = require(cfilePath);
                                    controller.modulePath = cfilePath;
                                }
                                catch(e){ m.kill(e); }
                        }
                        else m.kill("Model definition error. Objects should be an array of strings.");
                        if (typeof controller.extend != "function") controller.extend = rest.extend;

                        controller.extend = rest.extend;
                        object.controller = controller.extend({});
                        object.controller.super = m.super;
                        object.controller.pluginName = cfg.name;
                        object.controller.permissions = object.controller.permissions || ["all"];
                        object.controller.dependencies = object.controller.dependencies || [];
                        object.controller.actions = object.controller.actions || {};

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
                            model.middleware = require(mfilePath);
                            model.middleware.modulePath = mfilePath;
                        }
                        catch(e){m.kill(e);}
                }

                var models = pluginScope.modelNames.slice();
                var initialisersPath = cfg.path + "/server/app/initializers/";
            }
            catch(e){ m.kill(e); }

            function initModels(){
                if (models.length == 0){ return dfd.resolve(pluginScope); }
                var name = models.shift();
                try {
                    var f = require(modelFilePath(name,initialisersPath)).apply(pluginScope.models[name],[cfg,initModels]);
                    if (!f) return;
                    if (f.__proto__ = dfd.promise.__proto__) f.then(initModels).done();
                    else {
                        m.log("Initializer should return void or Q thenable object: "+name);
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