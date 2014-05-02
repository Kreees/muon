module.exports = function(self,deps){
    function exceptionHandler(err){
        if (deps.sys.mInitFlag) self.exception(err);
        else self.error(err);
    }

    return {
        __init__: function(){
            process.on("uncaughtException",exceptionHandler);
        },
        __deinit__: function(){
            process.removeListener("uncaughtException",exceptionHandler);
        },
        "log": self.require("lib/log"),
        "error": self.require("lib/error"),
        "exception": self.require("lib/exception")
    }
}