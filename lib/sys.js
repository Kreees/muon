var path = require("path");
var Q = require("q");
var _ = require("underscore");
var fs = require("fs");
var util = require("util")

var initPublicInterface = require("./share/init-public")


module.exports = function(m){
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
        ret.unshift(m);
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

    util.inherits(MuonSysModule,require("events").EventEmitter);

    MuonSysModule.prototype.toString = function(){
        return "SysModule '"+this.name+"'";
    }

    Object.defineProperty(MuonSysModule.prototype,'require',{value: function(moduleName){

        if (moduleName in this.moduleCache)
            return this.moduleCache[moduleName];

        var modulePath = sys.path + "lib/modules/"+this.name+"/"+moduleName+"."+this.mode+".js";
        if (!fs.existsSync(modulePath)) {
            modulePath = sys.path + "lib/modules/"+this.name+"/"+moduleName+".js";
        }
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

        return modeFile.reduce(function(p,moduleName){
            return p.then(_.partial(loadModule,moduleName,mode)).catch(function(e){
                console.error("[sys.loadMode] Can't load module '"+moduleName+"':", (e instanceof Error)?e.stack:e);
                process.exit();
            });
        },Q()).then(function(){
            mInitFlag = false;
        });
    }

    function loadModule(moduleName,srvMode){
        if (moduleName in loadedModules) {
            return Q(loadedModules[moduleName]);
        }

        var manifest = sys.path+"/lib/modules/"+moduleName+"/manifest.json";
        var modulePath = sys.path+"/lib/modules/"+moduleName+"/module."+ srvMode+".js";

        if (!fs.existsSync(modulePath)) {
            modulePath = sys.path+"/lib/modules/"+moduleName+"/module.js";
        }

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

        manifest.public = manifest.public || [];

        return manifest.dependency.reduce(function(p,depModuleName){
            if (depModuleName == "sys") {
                return p;
            }
            return p.then(_.partial(loadModule,depModuleName,srvMode))
                .then(function(){ depRelations[depModuleName].push(moduleName); })
                .catch(function(e){
                    console.error("[sys.loadModule] Can't load module '"+depModuleName+"': ", (e instanceof Error)?e.stack:e);
                    process.exit();
                });
        },Q()).then(function(){
            var modF = require(path.normalize(modulePath));
            if (!_.isFunction(modF)) {
                throw Error("Module '"+moduleName+"' should be a function");
            }

            dependencyObjects[moduleName] = {};

            try {
                var newModule = new MuonSysModule(moduleName,srvMode,manifest);
                var mod = modF.apply(newModule,newModule.dependency);
                Object.defineProperty(mod,"callerModule",{value: newModule });
            }
            catch(e){
                console.log(e);
                process.exit();
            }
            for(var i in mod) if (!/^__/.test(i)) {
                Object.defineProperty(newModule,i,{ value: mod[i],enumerable: true});
            }

            loadedModules[moduleName] = newModule;
            srcLoadedModules[moduleName] = mod;
            modulesManifest[moduleName] = manifest;

            if (!(moduleName in depRelations)) {
                depRelations[moduleName] = [];
            }

            depRelations[moduleName].forEach(function(dependentModule){
                if (dependentModule in dependencyObjects){
                    dependencyObjects[dependentModule][moduleName] = newModule;
                }
            });

            initPublicInterface(m,mod,manifest,moduleName);

            return Q.when(_.isFunction(mod.__init__)?mod.__init__():Q())
                .then(function(){
                    return newModule;
                });
        });
    }

    function clearCache() {
        var cwd = process.cwd();
        _.forEach(require.cache,function(val,name){
            if ((name.indexOf(path.resolve(cwd,"node_modules")) == -1) &&
                (name.indexOf(cwd) == 0)){
                delete require.cache[name];
            }
        });
    }

    function reload(){
        var realPath = process.cwd();
        while(!fs.existsSync(realPath+"/.muon")){
            var prevPath = realPath;
            realPath = fs.realpathSync(realPath+'/..');
            if (realPath == prevPath) {
                console.log("Can't launch project outside of project directory.");
                process.exit();
            }
        }

        process.chdir(realPath);

        clearCache();

        return _.keys(srcLoadedModules).reduce(function(p,name){
            if (typeof srcLoadedModules[name].__deinit__ != "function" || modulesManifest[name].allowReload == false) {
                return p;
            } else {
                return p.then(srcLoadedModules[name].__deinit__)
                    .catch(function(err){
                        console.error("[sys.reload] Can't deinit module '"+name+"': ",err.stack);
                        process.exit();
                    });
            }
        },Q()).then(function(){
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
    return sys;
}
