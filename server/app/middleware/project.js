module.exports = function(req,res,next){
    this.__data__ = {};
    next();
}