/**
 * 
 * 
 */

module.exports = function(self,deps){
    
    return Scheme;

}

var _ = require("underscore");
var crypto = require("crypto");
var g = require("grunt");
var cfgPath = 
var db = deps.cfg.db.default;

var Scheme = function(cfgPath){
    this.hash;
    this.scheme;
}
Scheme.prototype.load = function(path){
    console.log("load " + path);
    if(g.file.exists(path)){
       var obj = g.file.readJSON(path);
       if(obj.hash instanceof String) this.hash = obj.hash;
       if(obj.scheme instanceof Object) this.scheme = obj.scheme;
       
    }else{
        console.log("Scheme.load: file not exists: "+path);
    }
},
Scheme.prototype.compare = function(modelName, modelSch){
    var ret = {add:[], rm:[], chng:[]};
    var bdSch = this.scheme[modelName];
    if(!bdSch){
        console.log("No table for model: "+modelName);
        return ret.add = _.keys(modelSch);
    } 
    var newAttrs = _.keys(modelSch);
    var bdAttrs = _.keys(bdSch);
    ret.add = _.difference(newAttrs, bdAttrs);
    ret.rm = _.difference(bdAttrs, newAttrs);
    ret.chng = _.filter(_.difference(newAttrs, ret.add), function(key){
        return !_.isEqual(newAttrs[key], bdAttrs[key]);
    })
    return ret;
}
Scheme.prototype.isSynced = function(modelName, modelSch){
    if(calcHash(JSON.stringify(scheme[name])) == bdhash[name]) return true;
    else return false;
}
function calcHash(data) {
    var hash = crypto.createHash("md5");
    hash.update(data);
    return hash.digest('hex');
}

function save(modelname, properties) {
    bdhash[modelname] = calcHash(JSON.stringify(properties));
    bdscheme[modelname] = properties;
    g.file.write(cfgPath, JSON.stringify({hash:bdhash, scheme: bdscheme}));
    return true;
}


function isSynced(name) {
    if(calcHash(JSON.stringify(scheme[name])) == bdhash[name]) return true;
    else return false;
}