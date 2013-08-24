module.exprts = function(next){
    this.__data__ = {};
    next();
}