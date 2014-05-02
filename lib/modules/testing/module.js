module.exports = function(){
    return {
        __public__: function(){
            var obj = {};
            Object.defineProperty(obj,"httpMock",{value: require("./http_mock")});
            return obj;
        }
    }
}