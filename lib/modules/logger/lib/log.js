module.exports = function(self,deps){
    return function(){
        var args = [].slice.call(arguments);
        args = args.map(function(a){
            if (a instanceof Error) return a.stack;
            return a;
        });
        args.unshift("[muon."+this.callerModule.name +"] ");
        console.log.apply(console,args);
        var stack = deps.utils.processTraceStack(__filename,1);
        if (stack.length > 0){
            console.log("  Logger was invoked from:")
            console.log(stack);
            console.log("");
        }
    }
}