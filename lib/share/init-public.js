module.exports = function(module,manifest,name){
    var pubName = manifest.publicAlias || name;
    if (typeof module.__public__ == "function"){
        Object.defineProperty(m, pubName,{
            get: module.__public__,
            enumerable: true,
            configurable: true
        });
    }
    else if (typeof module.__public__ == "object") {
        Object.defineProperty(m, pubName, {
            value: module.__public__,
            enumerable: true,
            configurable: true,
            writable: false
        });
    }
    else{
        Object.defineProperty(m,pubName,{
            value: {},
            enumerable: true,
            configurable: true,
            writable: false
        });
    }

    var pubMod = m[pubName];

    for(var i in manifest.public){
        var method = manifest.public[i];
        if (typeof module[method] == "function")
            Object.defineProperty(pubMod,method,{
                value: module[method].bind(module),
                propertyEnumerable: true,
                propertyConigurable: true,
                propertyWritable: false
            });
        else
            Object.defineProperty(pubMod,method,{
                value: module[method],
                propertyEnumerable: true,
                propertyConigurable: true,
                propertyWritable: false
            });
    }
}