module.exports = function(self){
    return function(){
        var args = [].slice.apply(arguments);
        args.unshift("EXCEPTION:");
        self.error.apply(this,args);
        process.exit();
    }
}