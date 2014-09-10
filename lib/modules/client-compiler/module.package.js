module.exports = function(self,deps){
    var PackageNotExists = function(){};
    PackageNotExists.prototype = new Error();
    return {
        __init__: function(){
            var app = deps.express.newApp();
            Object.defineProperty(self,"expressApp",{value: app});
        },
        renderIndex: self.require("lib/index"),
        renderMuonJS: self.require("lib/muonjs"),
        renderPackage: self.require("lib/package"),
        renderTranslation: self.require("lib/translation"),
        renderView: self.require("lib/view"),
        renderModel: self.require("lib/model"),
        PackageNotExists: function(){},
        ViewNotExists: function(){},
        __public__: function(){
            var obj = {};
            Object.defineProperty(obj,"renderIndex",{get: function(){ return self.renderIndex;}});
            Object.defineProperty(obj,"renderPackage",{get: function(){ return self.renderPackage;}});
            Object.defineProperty(obj,"renderMuonJS",{get: function(){ return self.renderMuonJS;}});
            Object.defineProperty(obj,"renderTranslation",{get: function(){ return self.renderTranslation;}});
            Object.defineProperty(obj,"renderView",{get: function(){ return self.renderView;}});
            Object.defineProperty(obj,"renderModel",{get: function(){ return self.renderModel;}});
            return obj;
        }
    }
}