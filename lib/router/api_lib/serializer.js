function serializeObj(obj,d,t){
    if (!d) return obj;
    var newObject = {};
    for(var i in d){
        if (d[i] in obj) newObject[d[i]] = obj[d[i]];
    }
    if (d.length > 0) newObject._id = obj._id;
    return newObject;
}

function serialize(obj,d,t){
    if (obj instanceof Array) return obj.map(function(a){return serializeObj(a,d,t)});
    else return serializeObj(obj,d,t);
}

module.exports = {
    serialize: serialize
}