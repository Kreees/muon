var path = require("path");

module.exports = {
    path: path.normalize(__dirname+"/../"),
    require: function(a){ return require(path.normalize(this.path+"/lib/"+a)); },
    serverInitFlag: true
};