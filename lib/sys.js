var path = require("path");
var Q = require("q");
var _ = require("underscore");
var fs = require("fs");

var initPublicInterface = require("./share/init-public")

var sys = {};
var loadedModules = {};
var srcLoadedModules = {};
var modulesManifest = {};

var depRelations = {};
var dependencyObjects = {};

var mInitFlag = true;

sys.modules = loadedModules;

function procErrorStack(stack){
    var ret = [];
    stack.split("\n").forEach(function(it){
        if (it.indexOf(path.normalize(sys.path+"/node_modules/")) != -1) return;
        if (it.indexOf(__filename) != -1) return;
        if (it.indexOf("process._tickCallback (node.js") != -1) return;
        ret.push(it);
    })
    return ret.join("\n");
}

function composeRequireArguments(module){
    var ret = [dependencyObjects[module.name]];

    (module.manifest.dependency || []).forEach(function(moduleName){
        var depModule;
        if (moduleName in loadedModules){
            function DependncySysModule(){ this.callerModule = module; };
            DependncySysModule.prototype = loadedModules[moduleName];
            depModule = new DependncySysModule();
        }
        else if (moduleName == "sys")  depModule = sys;
        else {
            console.error("[sys.require] Module '"+moduleName+"' is not loaded.");
            process.exit();
        }
        ret[0][moduleName] = depModule;
    });
    ret.unshift(module);

    return ret;
}

function MuonSysModule(name,srvMode,manifest){
    this.callerModule = this;
    Object.defineProperty(this,'name',{value: name});
    Object.defineProperty(this,'mode',{value: srvMode});
    Object.defineProperty(this,'manifest',{value: manifest});
    Object.defineProperty(this,'path',{value: path.normalize(sys.path+"/lib/modules/"+name)});
    Object.defineProperty(this,'syspath',{value: sys.path});
    Object.defineProperty(this,'moduleCache',{value: {}});
    Object.defineProperty(this,"dependency",{value: composeRequireArguments(this)});
}

require("util").inherits(MuonSysModule,require("events").EventEmitter);

MuonSysModule.prototype.toString = function(){
    return "SysModule '"+this.name+"'";
}

Object.defineProperty(MuonSysModule.prototype,'require',{value: function(moduleName){
    if (moduleName in this.moduleCache)
        return this.moduleCache[moduleName];

    var modulePath = sys.path + "lib/modules/"+this.name+"/"+moduleName+"."+this.mode+".js";
    if (!fs.existsSync(modulePath)) modulePath = sys.path + "lib/modules/"+this.name+"/"+moduleName+".js";
    try {
        var moduleF = require(modulePath);
        if (typeof moduleF != "function"){
            console.error("[sys.require] Module is not a function: "+modulePath);
            process.exit();
        }
        return this.moduleCache[module] = moduleF.apply(this,this.dependency);
    } catch(e){
        var stack = e.stack.split('\n');
        console.error("[sys."+this.name+".require]", e.stack);
        for(var i = 0, len = stack.length; i < len; i++){
            if (stack[0].indexOf(__filename) != -1) break;
            stack.shift();

        }
        console.error(stack.join("\n"));
        process.exit();
    }
}});

function loadMode(mode,path){
    path = path || sys.path;
    var modeFile;
    mInitFlag = true;
    if (fs.existsSync(path+"/lib/modes/"+mode+".js")){
        modeFile = path+"/lib/modes/"+mode+".js";
    } else if (fs.existsSync(sys.path+"/lib/modes/"+mode+".js")) {
        modeFile = sys.path+"/lib/modes/"+mode+".js";
    }

    if (!modeFile){
        console.error("[sys.loadMode] Unknown server mode");
        process.exit();
    }
    try{
        modeFile = require(modeFile);
        if (!_.isArray(modeFile)) throw Error("");
    }
    catch(e){
        console.error("[sys.loadMode] Wrong file with server mode description. Should be an array of names of modules.");
        process.exit();
    }

    var promise;

    modeFile.reduce(function(p,moduleName){
        promise = p.then(_.partial(loadModule,moduleName,mode)).catch(function(e){
            console.error("[sys.loadMode] Can't load module '"+moduleName+"':", (e instanceof Error)?e.stack:e);
            process.exit();
        });
        return promise;
    },Q());

    return promise.then(function(){
        if (mode == "testing") m.sys = sys;
//        else delete m.sys;
        console.log("Mode "+mode+" is loaded.");
        mInitFlag = false;
    });
}

function loadModule(moduleName,srvMode){
    if (moduleName in loadedModules)
        return Q(loadedModules[moduleName]);

    var manifest = sys.path+"/lib/modules/"+moduleName+"/manifest.json";
    var modulePath = sys.path+"/lib/modules/"+moduleName+"/module."+ srvMode+".js";
    if (!fs.existsSync(modulePath)) modulePath = sys.path+"/lib/modules/"+moduleName+"/module.js";

    if (!fs.existsSync(manifest) || !fs.existsSync(modulePath)) {
        console.error("[sys.loadModule] Can't find module '"+moduleName+"'");
        process.exit();
    }

    try {
        manifest = JSON.parse(fs.readFileSync(manifest));
    }
    catch(e){
        console.error("[sys.loadModule] Manifest file corrupted. Should be json.");
        process.exit();
    }

    var promise = Q();

    manifest.public = manifest.public || [];

    manifest.dependency.reduce(function(p,depModuleName){
        if (depModuleName == "sys") return p;
        return promise = p.then(_.partial(loadModule,depModuleName,srvMode))
            .then(function(){ depRelations[depModuleName].push(moduleName); })
            .catch(function(e){
                console.error("[sys.loadModule] Can't load module '"+depModuleName+"': ", (e instanceof Error)?e.stack:e);
                process.exit();
            });
    },promise);

    return promise.then(function(){
        var modF = require(path.normalize(modulePath));
        if (typeof modF != "function") throw Error("Module '"+moduleName+"' should be a function");

        dependencyObjects[moduleName] = {};

        try {
            var newModule = new MuonSysModule(moduleName,srvMode,manifest);
            var mod = modF.apply(newModule,newModule.dependency);
            Object.defineProperty(mod,"callerModule",{value: newModule    });
        }
        catch(e){
            console.log(e);
            process.exit();
        }
        for(var i in mod) if (!/^__/.test(i))
            Object.defineProperty(newModule,i,{ value: mod[i],enumerable: true});

        loadedModules[moduleName] = newModule;
        srcLoadedModules[moduleName] = mod;
        modulesManifest[moduleName] = manifest;

        if (!(moduleName in depRelations)) depRelations[moduleName] = [];


        depRelations[moduleName].forEach(function(dependentModule){
            if (dependentModule in dependencyObjects){
                dependencyObjects[dependentModule][moduleName] = newModule;
            }
        });

        initPublicInterface(mod,manifest,moduleName);

        return Q.when(typeof mod.__init__ == "function"?mod.__init__():Q())
            .then(function(){
                //         initPublicInterface(mod,manifest,moduleName);
                return newModule;
            });
    });
}

function reload(){
    var promise = Q();
    _.keys(srcLoadedModules).reduce(function(p,name){
        if (typeof srcLoadedModules[name].__deinit__ != "function" || modulesManifest[name].allowReload == false)
            return promise = p;
        return promise = p.then(srcLoadedModules[name].__deinit__)
            .catch(function(err){
                console.error("[sys.reload] Can't deinit module '"+name+"': ",err.stack);
                process.exit();
            });
    },promise);

    return promise.then(function(){
        for(var i in require.cache){
            if (i.lastIndexOf(path.normalize(sys.path+"/node_modules")) == -1)
                if (i == __filename) continue;
            delete require.cache[i];
        }

        for(var i in srcLoadedModules){
            if (modulesManifest[i].allowReload == false) continue;
            delete loadedModules[i];
            delete srcLoadedModules[i];
            delete modulesManifest[i];
            for(var module in depRelations)
                depRelations[module] = _.without(depRelations[module],i);
        }
    });
}

Object.defineProperty(sys,"path",{value: path.normalize(__dirname+"/../")});
Object.defineProperty(sys,"loadMode",{value: loadMode});
Object.defineProperty(sys,"loadModule",{value: loadModule});
Object.defineProperty(sys,"reload",{value: reload});
Object.defineProperty(sys,"mInitFlag",{get: function(){return mInitFlag}});
module.exports = sys;
