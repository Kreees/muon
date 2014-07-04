module.exports = function(self,deps){
    var states = self.require('lib/state');
    var dbg = true;
    return {
        __init__ : function(dbPath){
           return states.__init__(dbPath);
        }, 
        process: function(){
            return states.lastState().then(function(stt){
                var appS = [];
                for (var i in m.app.models) {
                    appS[i] = m.app.models[i].allProperties;
                }
                var diff = states.difference(appS, stt.scheme);
                if(diff.need){
                    if(dbg){
                        console.log("Need to sync <--");
                        console.log("  Add models: " +diff.addModels);
                        console.log("  Add Attributes: " +JSON.stringify(diff.addModelAttr));
                        console.log("  Remove models: " +diff.rmModels);
                        console.log("  Remove model attributes: " +JSON.stringify(diff.rmModelAttr));
                        console.log("-->");
                    } 
                } else {
                    if(dbg) console.log("Nothing to sync.");
                }
            });
        }
        
    };  
};
