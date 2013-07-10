module.exports = function(cfg,cb){
    this.__data__ = {config: global.m.cfg};
    this.__data__.config._id = "config";
    cb();
}