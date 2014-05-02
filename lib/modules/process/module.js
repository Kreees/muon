module.exports = function(self,deps){
    function exit(){
        require("fs").writeFileSync(".muon","");
        process.exit();
    }

    return {
        __init__ : function(){
            process.on('SIGINT',exit);
            process.on('exit',exit);
        },
        kill: function(){
            var args = [].slice.call(arguments);
            for(var message in args){

            }
            if (message instanceof Error) console.log(deps.utils.processTraceStack(message.stack));
            else {
                var e = new Error();
                console.error.apply(console,arguments);
                console.error(deps.utils.processTraceStack(e.stack,2));
            }
            process.exit();
        }
    }
}