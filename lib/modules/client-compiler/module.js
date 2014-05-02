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
        ViewNotExists: function(){}
    }
}