module.exports = function(self,deps){
    return function(){
        console.log.apply(console,arguments);
    }
}