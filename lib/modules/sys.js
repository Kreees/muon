var path = require("path");

module.exports = {
    path: path.normalize(__dirname+"/../../"),
    require: function(a){
        try {
            return require(path.normalize(this.path+"/lib/"+a));
        }
        catch(e){
            var stack = e.stack.split('\n');
            console.error("[sys.require]", e.message);
            for(var i = 0, len = stack.length; i < len; i++){
                var str = stack.shift();
                if (str.indexOf(__filename) != -1) break;
            }
            console.log(stack.join("\n"));
            process.exit();
        }
    },
    serverInitFlag: true
};