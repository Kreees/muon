module.exports = function(next){
    this.__data__ = {};
    next();
}