var url = require("url");
var fs = require("fs");
var ObjectID = require('mongodb').ObjectID;
var MongoClient = require('mongodb').MongoClient;
var srvUrl;


function initMongo(server, scheme){
    srvUrl = server.url;
    for (i in scheme.collections){
        createMongoSync(scheme.collections[i], server.routeTable);
    }
}

function loadAsFile(key, callback){
    MongoClient.connect(srvUrl, function(err, db) {
        if(!err) console.log("We are connected");
        else throw err;
        db.collection(key).find().sort({"_id":1}).toArray(function(err, items){
            callback('v_'+key+'.txt', items);
        });
    });
}

function createMongoSync(coll, table){
    table['^\/'+coll] = function(req, res, data){
        function callback(result){
            if(result != undefined){
//                res.writeHead(200, {"Content-Type": ctype["json"]});
                if(result != 1) {res.write(JSON.stringify(result));}
            }else{
                res.writeHead(500);
            }
            res.end();
        }
        sync(req, data, coll, callback);
    };
}


function sync(req, data, key, callback){
//    console.log("!!!!REQUEST Mongo!!!");
//    console.log(["REQUEST method: ", req.method]);
//    console.log(["Recive data: ", data]);


    function create(coll, data){
        coll.insert(JSON.parse(data), {w:1}, function(err, result) {
            if (err) throw err;
//            console.log(["Create in base result:", result]);
            callback(result[0]);
            // res.writeHead(200, {"Content-Type": ctype["json"]});
            // res.write(JSON.stringify(result[0]));
            // res.end();
        });
//        console.log('Create new contact!');
    }
    function change(coll, data){
//        console.log(['CHANGE data in base request:', JSON.parse(data)]);
        var val=JSON.parse(data);
        var s = new ObjectID(val._id);
        val._id = s;
        coll.save(val, {w:1}, function(err, result) {
            if (err) throw err;
            callback(1);
            // res.writeHead(200, {"Content-Type": ctype["json"]});
            // res.end();
//            console.log(result)
        });
    }
    function remove(coll, data){
//        console.log(['REMOVE data from base request:', data]);
        var s = new ObjectID(data);
        coll.remove({_id: s}, {w:1}, function(err, result) {
            if (err) throw err;
//            console.log(["REMOVE data from base result:", result]);
            callback(1);
            // res.writeHead(200, {"Content-Type": ctype["json"]});
            // res.end();
        });
    }
    function get(coll, data){
//        console.log(['GET data from base request:',data]);
        var s = new ObjectID(data);
        // res.writeHead(200, {"Content-Type": ctype["json"]});
        coll.find({_id: s}).toArray(function(err,items){
            callback(items[0]);
//            console.log(items[0]);
        });
        // each(function(doc){
        // if(doc !== null) res.write(JSON.stringify(doc));
        // res.end();
        // });

    }
    function getAll(coll){
//        console.log(['GET ALL data from base request:']);
        // res.writeHead(200, {"Content-Type": ctype["json"]});
        coll.find().sort({"_id":1}).toArray(function(err,items){
            if(err) throw err;
            callback(items);
            // res.write(JSON.stringify(items));
            // res.end();
        });
    }

    controller = null;
    var ret;
    var pathname = url.parse(req.url).pathname;
//    console.log(pathname);
    if(req.method=="POST" && pathname.match('^\/'+key+'$')){ controller=create;}
    if(req.method=="PUT" && pathname.match('^\/'+key+'\/\\w{1,25}')){ controller=change;}
    if(req.method=="DELETE" && pathname.match('^\/'+key+'\/\\w{1,25}$')){
        data = pathname.match('^\/'+key+'\/(\\w+){1,25}', pathname)[1];
        controller=remove;
    }
    if(req.method=="GET" && pathname.match('^\/'+key+'\/\\w{1,25}$')){
        data = pathname.match('^\/'+key+'\/(\\w+){1,25}', pathname)[1];
        controller=get;
    }
    if(req.method=="GET" && pathname.match('^\/'+key+'$')){ controller=getAll;}


}



exports.loadAsFile=loadAsFile;
exports.init=initMongo;
exports.sync=sync;