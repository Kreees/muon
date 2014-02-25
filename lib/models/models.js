var fsExt = m.sys.require("/utils/fs/fs_ext.js"),
    rest = m.sys.require("/controllers/resource.js"),
    path = require("path"),
    Q = require("q"),
    _ = require("underscore"),
    fs = require("fs")
;

function getModel(name,plName){
    plName = plName || "";
    if (typeof name != "string" || typeof plName != "string") throw Error("getModel: name attribute should be a string");
    var thisPluginName = plName || (this.cfg?this.cfg.name:"");
    if (name.indexOf(":") != -1){
        var dependencyFullName = (thisPluginName?thisPluginName+":":"")+name;
        var subPlugin = dependencyFullName.split(":");
        var modelName = subPlugin.pop(); subPlugin = subPlugin.join(":");
        if (!m.__plugins[subPlugin]) throw Error("Plugin does not exist: "+subPlugin);
        return m.__plugins[subPlugin].models[modelName];
    }
    else {
        if (this.models && this.__plugins){
            if (this.__plugins[plName] && this.__plugins[plName].models) return this.__plugins[plName].models[name];
            else return undefined;
        }
        if (plName && m.__plugins[plName]) return m.__plugins[plName].models["name"];
        else return m.models[name];
    }
}

function normalizeDescription(name,plugin,descr){
    descr = m.utils._.clone(descr || {});
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
    _.extend(model.hasOne,descr.belongsTo || {})
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

    model.objectsList = descr.objects || [];
    if (descr.super) model.objectsList = m.utils._.keys(descr.super.objects).concat(model.objectsList || []);
    model.objects = {};

    model.scopesList = descr.scopes || [];
    if (descr.super) model.scopesList = m.utils._.keys(descr.super.objects).concat(model.scopesList || []);
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
            files = files.filter(function(file){ return !file.match(/\/_[a-zA-Z_\d\.]+$/); });
            var pluginScope = {}
            var initOrder = [];
            pluginScope.models = {};

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
                        if (!(_model.extends in pluginScope.models)){
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
                        "modelName": _model.modelName,
                        "fullName": _model.fullName,
                        "pluginName": _model.pluginName
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
                model.accessible = (_model.accessible !== false)?true:false;
                model.prototype.model = model;
                model.modulePath = path.normalize(filePath);
                model.scopes = {};
                model.objects = {};
                model.fullName = _model.fullName;
                model.pluginName = _model.pluginName;
                model.hasOneRelations = {};
                model.hasManyRelations = {};

                // объявляем глобально
                pluginScope.models[model.modelName] = model;

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
                    var hasOneKeys = m.utils._.keys(hasOne)
                    for(var i = 0, keysLen = hasOneKeys.length; i < keysLen; i++){
                        var key = hasOneKeys[i], descr = hasOne[key];
                        var refModel,refDescr = {};
                        if (typeof descr == "string") {
                            refModel = getModel(descr,cfg.name) || pluginScope.models[descr];
                            if (!refModel) m.kill("Unknown model reference to: "+descr);
                            model.hasOneRelations[key] = descr;
                        }
                        else {
                            if (!(descr.model || descr.type)) m.kill("Model hasOne property descriptor must contain 'model' or 'type' attribute referenced to other model. Model: "+model.modelName);
                            var modRefName = descr.model || descr.type;
                            refModel = getModel(modRefName,cfg.name) || pluginScope.models[modRefName];
                            if (!refModel) m.kill("Unknown model reference to: "+descr);
                            model.hasOneRelations[key] = modRefName;
                            if (descr.reverse) refModel.hasManyRelations[descr.reverse] = modRefName;
                            delete descr.model;
                            delete descr.type;
                            refDescr = descr;
                        }
//                        console.log(key)
                        model.hasOne(key,refModel,refDescr);
                    }
                }

                for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){
                    var model = pluginScope.models[initOrder[modelIndex]];
                    var hasMany = descriptors[model.modelName].hasMany;
                    if (typeof hasMany != "object") continue;
                    var hasManyKeys = m.utils._.keys(hasMany);
                    for(var i = 0, keysLen = hasManyKeys.length; i < keysLen; i++){
                        var key = hasManyKeys[i], descr = hasMany[key];
                        var refModel,refDescr = {};
                        if (typeof descr == "string"){
                            refModel = getModel(descr,cfg.name) || pluginScope.models[descr];
                            if (!refModel) throw Error("Unknown model reference to: "+descr);
                            model.hasManyRelations[key] = descr;
                        }
                        else {
                            if (!(descr.model || descr.type)) m.kill("Model hasMany property descriptor must contain 'model' or 'type' attribute referenced to other model. Model: "+ model.modelName);
                            var modRefName = descr.model || descr.type;
                            refModel = getModel(modRefName,cfg.name) || pluginScope.models[modRefName];
                            if (!refModel) throw Error("Unknown model reference to: "+descr);
                            if (descr.reverse) refModel.hasManyRelations[descr.reverse] = modRefName;
                            delete descr.model;
                            delete descr.type;
                            refDescr = descr;
                        }
                        model.hasMany(key,refModel,{},refDescr);
                    }
                }

                var actionssPath = cfg.path+"/server/app/actions/";
                for(var modelIndex = 0, len = initOrder.length; modelIndex < len; modelIndex++){
                    var model = pluginScope.models[initOrder[modelIndex]];
                    var name = model.modelName;
                    // задаем контроллер для модели
                    // Если точного соответствия имени файла контроллера и имени модели нет
                    // то пытаемся подняться на ступень выше и взять контроллер на ступень выше.
                    // Это обеспечит условное наследование моделей.
                    // Если ниодного контроллера нет - то фолбечимся до обычного реста

                    if (model.super) m.super = model.super.actionModule;
                    else m.super = rest;

                    var action;
                    try {
                        var actionsName = name;
                        while(!fs.existsSync(modelFilePath(actionsName,actionssPath))) {
                            var _actionsName = actionsName.substring(0,actionsName.lastIndexOf("."));
                            if (_actionsName == actionsName) throw Error();
                            actionsName = _actionsName;
                        }
                        try {
                            var cfilePath = path.normalize(modelFilePath(actionsName,actionssPath));
                            action = require(cfilePath);
                            action.modulePath = cfilePath;
                        }
                        catch(e) {m.kill(e);}
                    }
                    catch(e) {
                        action = m.super;
                    }

                    action.extend = rest.extend;
                    model.actionModule = action.extend({});
                    model.actionModule.super = m.super;
                    model.actionModule.pluginName = cfg.name;
                    model.actionModule.permissions = model.actionModule.permissions || ["all"];
                    model.actionModule.dependencies = model.actionModule.dependencies || [];
                    model.actionModule.actions = model.actionModule.actions || {};

                    // Выполняем привязку скоупов для моделей. Им

                    for(var i in descriptors[model.modelName].scopesList){
                        var scopeName = descriptors[model.modelName].scopesList[i];
                        var scope = function ModelScope(){}

                        if (model.super && model.super.scopes[scopeName])
                            m.super = model.super.scopes[scopeName].actionModule;
                        else m.super = model.actionModule;

                        var action;
                        if ('string' == typeof scopeName){
                            if (!fs.existsSync(actionssPath+name.replace(/\./g,"/")+"/"+scopeName+".js"))
                                action = m.super;
                            else
                                try {
                                    var cfilePath = path.normalize(actionssPath+name.replace(/\./g,"/")+"/"+scopeName+".js");
                                    action = require(cfilePath);
                                    action.modulePath = cfilePath;
                                }
                                catch(e){ m.kill(e); }
                        }
                        else m.kill("Model definition error. Scopes should be an array of strings.");

                        if (typeof action.extend != "function") action.extend = rest.extend;



                        action.extend = rest.extend;
                        scope.actionModule = action.extend({});
                        scope.actionModule.super = m.super;
                        scope.actionModule.pluginName = cfg.name;
                        scope.actionModule.permissions = scope.actionModule.permissions || ["all"];
                        scope.actionModule.dependencies = scope.actionModule.dependencies || [];
                        scope.actionModule.actions = scope.actionModule.actions || {};

                        scope.model = model;
                        scope.modelName = model.modelName;
                        scope.scopeName = scopeName;

                        model.scopes[scopeName] = scope;
                    }
                    for(var i in descriptors[model.modelName].objectsList){
                        var objectName = descriptors[model.modelName].objectsList[i];
                        var object = function ModelObject(){}

                        if (model.super && model.super.objects[objectName])
                            m.super = model.super.objects[objectName].actionModule;
                        else m.super = model.actionModule;

                        var action = null;
                        if ('string' == typeof objectName){
                            if (!fs.existsSync(actionssPath+name.replace(/\./g,"/")+"/"+objectName+".js"))
                                action = m.super;
                            else
                                try {
                                    var cfilePath = path.normalize(actionssPath+name.replace(/\./g,"/")+"/"+objectName+".js");
                                    action = require(cfilePath);
                                    action.modulePath = cfilePath;
                                }
                                catch(e){ m.kill(e); }
                        }
                        else m.kill("Model definition error. Objects should be an array of strings.");
                        if (typeof action.extend != "function") action.extend = rest.extend;

                        action.extend = rest.extend;
                        object.actionModule = action.extend({});
                        object.actionModule.super = m.super;
                        object.actionModule.pluginName = cfg.name;
                        object.actionModule.permissions = object.actionModule.permissions || ["all"];
                        object.actionModule.dependencies = object.actionModule.dependencies || [];
                        object.actionModule.actions = object.actionModule.actions || {};

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

                var models = _.keys(pluginScope.models);
                var initialisersPath = cfg.path + "/server/app/initializers/";
            }
            catch(e){ m.kill(e); }

            function initModels(){
                if (models.length == 0){
                    return dfd.resolve(pluginScope);
                }
                var name = models.shift();
                try {
                    var initMod = require(modelFilePath(name,initialisersPath));
                    if (typeof initMod != "function")
                        m.kill("Initializer module.exports should be a function: "+modelFilePath(name,initialisersPath));
                    var f = initMod.apply(pluginScope.models[name],[cfg,initModels]);
                    if (!f) return;
                    if (f.__proto__ == dfd.promise.__proto__) f.then(initModels).done();
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