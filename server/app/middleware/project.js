module.exports = function(req,res,next){
    this.__data__ = {
        config: {1:2}
    };
    next();
}