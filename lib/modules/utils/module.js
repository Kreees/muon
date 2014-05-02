module.exports = function(self,deps){
    var path = require("path");
    var _ = require("underscore");
    var Q = require("q");
    return {
        newError: function(name){
            function MuonError(msg) {
                this.name = name;
                this.message = msg;
                this.stack = name+": "+msg+"\n"+self.processTraceStack(1)+"\n";
            }
            MuonError.prototype = new Error();
            return MuonError;
        },
        fsExt: require("./lib/fs_ext"),
        lessPrepare: self.require("lib/less_prepare"),
        getPassedArgumentsNumber: function(f){
            if (typeof f != "function") throw Error("Argument should be a function");
            return f.toString().match(/function\s[a-zA-Z0-9_\$]*\((.*)\)/)[1].split(",").length;
        },
        processTraceStack: function(fileName,offset){
            if (typeof fileName == "number"){
                offset = fileName;
                fileName = undefined;
            }
            offset = offset || 0;
            var err = new Error();
            var ret = [];
            var proceedFlag = true;
            if (fileName && err.stack.indexOf(fileName) != -1)
                proceedFlag = false;

            var breakFlag = false;

            var pathes = {};

            _.keys(deps.sys.modules).forEach(function(name){
                return pathes[path.normalize(deps.sys.path+"/lib/modules/"+name)] = name;
            });
            err.stack.split("\n").slice(1).forEach(function(it){
                if (breakFlag) return;
                if (it.indexOf("at repl") != -1) return breakFlag = true;
                if (it.indexOf(fileName) != -1) proceedFlag = true;
                if (!proceedFlag) return;
                if (offset > 0) return --offset;

                if (it.indexOf(path.normalize(self.path+"/node_modules/")) != -1) return;
                if (it.indexOf(path.normalize(self.path+"/lib/sys")) != -1) return;
                if (it.indexOf(__filename) != -1) return;
                if (it.indexOf("process._tickCallback (node.js") != -1) return;
                _.keys(pathes).forEach(function(modPath){
                    if (it.indexOf(modPath) != -1) it = it.replace(modPath,"muon."+pathes[modPath]+" (")+")";
                });
                ret.push(it);
            })
            if (ret.length == 0) return "";
            return ret.join("\n");
        },
        __public__: function(){
            var obj = {};
            Object.defineProperty(obj,"Q",{value: Q});
            Object.defineProperty(obj,"_",{value: _});
            Object.defineProperty(obj,"orm",{value: require("orm")});

            return obj;
        }
    };
}