module.exports = function(self,deps){
    return function(){
        console.error.apply(console,arguments);
    }
}