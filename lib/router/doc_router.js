module.exports = function(req,res){
    var tokens = req.path.split(/\//);
    var some = tokens.shift();
    if (tokens.length == 1 && parseInt(tokens[0])){
        res.setHeader("Content-Type","application/json, encoding=utf8")
        var items = _.where(documentation,{_id:parseInt(tokens[0])});
        if (items.length > 0)
            res.end(JSON.stringify(items[0]));
        else {
            res.end(JSON.stringify({error: "Document object not found"}));
        }
        return;
    }
    var where_block = [];
    var obj_req = false;
    while(tokens.length != 0){
        var type = tokens.shift();
        if (type == "") break;
        var obj = {type:type};
        if (tokens.length == 1){
            obj.string = "";
            where_block.push(obj);
            obj = {type: "name",string:tokens.shift()};
            where_block.push(obj);
            obj_req = true;
        }
        else {
            obj.string = tokens.shift() || "";
            where_block.push(obj);
        }
    };
    var ret = [];
    for(var i in documentation){
        var descr = documentation[i];
        var flag = true;
        for(var k in where_block){
            var filtered = _.where(descr.tags,where_block[k]);
            if (filtered.length == 0){
                flag = false;
                break;
            }
        }
        if (!flag) continue;
        if (obj_req) ret = descr;
        else ret.push(descr);
    }
    res.setHeader("Content-Type","application/json, encoding=utf8")
    res.end(JSON.stringify(ret));
}