module.exports = function(cfg,cb){
    this.__data__ = {};
    this.__data__.config = JSON.parse(JSON.stringify(m.cfg));
    this.__data__.title = Object.create(m.cfg);
    this.__data__.config._id = "config";
    this.__data__.config.wait_restart = m.wait_restart;
    this.__data__.title._id = "title";
    cb();
}