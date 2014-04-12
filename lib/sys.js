var path = require("path");
var Q = require("q");
var _ = require("underscore");
var fs = require("fs");

var sys = {};
var loadedModels = {};

function getDependency(mode){
    var modeFile;
    if (fs.existsSync(this.path+"/lib/modes/"+mode+".js")){
        modeFile = this.path+"/lib/modes/"+mode+".js";
    } else if (fs.existsSync(m.cfg.path+"/modes/"+mode+".js")) {
        modeFile = m.cfg.path+"/lib/modes/"+mode+".js";
    }
    if (!modeFile){
        console.error("Unknown server mode");
        process.exit();
    }
    try{
        modeFile = require(modeFile);
        if (!_.isArray(modeFile)) throw Error("");
    }
    catch(e){
        console.error("Wrong file with server mode description. Should be an array of names of modules.");
        process.exit();
    }
    return modeFile;
}

function loadMode(mode){
    var dfd = Q.defer();
    var loadDefer = Q.defer();
    var promise = loadDefer.promise;

    getDependency().forEach(function(moduleName){
        promise = promise.then(_.partial(loadModule,moduleName));
    });
    promise.done(dfd.resolve);

    loadDefer.resolve();

    return dfd.promise;
}

function loadModule(module){
    var dfd = Q.defer();
    if (module in loadedModels) {
        _.defer(dfd.resolve);
        return dfd.promise;
    }

    if (!fs.existsSync(this.path+"/lib/modules/"+module+"/init.js")) {
        console.error("Can't find module: "+module);
        process.exit();
    }

    var mod = require(path.normalize(this.path+"/lib/modules/"+module+"/init.js"));

    try {
        var srvMode = m.cfg.serverMode.toLowerCase();
        if (typeof mod[srvMode] == "function") return mod[srvMode]();
        else if (typeof mod.common == "function") return mod.common();
        else return null;
    } catch(e){
        var stack = e.stack.split('\n');
        console.error("[sys.require]", e.message);
        for(var i = 0, len = stack.length; i < len; i++){
            var str = stack.shift();
            if (str.indexOf(__filename) != -1) break;
        }
        console.log(stack.join("\n"));
        process.exit();
    }

    _.defer(dfd.resolve);
    return dfd.promise;
}

function requireModule(moduleName){

}

function flush(){
    for(var i in loadedModels)
        loadedModels[i].deinit && loadedModels[i].deinit();
}

Object.defineProperty(sys,"path",{value: path.normalize(__dirname+"/../")});
Object.defineProperty(sys,"loadMode",{value: loadMode});
Object.defineProperty(sys,"loadModule",{value: loadModule});
Object.defineProperty(sys,"require",{value: requireModule});

module.exports = sys;