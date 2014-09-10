var cheerio = require("cheerio"),
    fs = require("fs"),
    http = require("http"),
    mime = require("mime"),
    _ = require("underscore"),
    url = require("url");

module.exports = function(args,callback){
    var assets = {};
    var index_assets = {};
    var cc = m["client-compiler"];
    cc.renderIndex().then(function(data){
        var $ = cheerio.load(data);
        ["src","href"].map(function(attr_name){
            $("["+attr_name+"]").each(function(a,el){
                var attr = $(el).attr(attr_name);
                if (/^(http:\/\/|https:\/\/|\/\/)/.test(attr)) {
                    assets[attr] = {
                        path: attr.replace(/^(http:\/\/|https:\/\/|\/\/)/,""),
                        remote: true,
                        protocol: /^https/.test(attr)?"https":"http",
                        src: attr.replace(/^(http:|https:)/,"")
                    };
                }
                else assets[attr] = { path: attr.replace(/^\//,"") };
                $(el).attr(attr_name,assets[attr].path);
            });
        });
        function get_asset(){
            var flag = true;
            var asset = null;
            for(var i in assets){
                asset = assets[i];
                delete assets[i];
                flag = false;
                break;
            }
            if (flag){
                return callback({
                    assets: index_assets,
                    data: $.html()
                });
            }
            if (asset.path == "muon.js"){
                console.log("Compiling muon.js client lib...");
                cc.renderMuonJS().then(function(data){
                    index_assets[asset.path] = {
                        data: data.replace(/__staticApp__ = false/g,"__staticApp__ = true"),
                        mime: "text/javascript"
                    }
                    get_asset();
                }).done();
            }
            else if (asset.remote){
                console.log("Retriving "+asset.protocol+":"+asset.src+"...");
                var url_parsed = url.parse(asset.protocol+":"+asset.src);
                var r = http.request({
                    host: url_parsed.host,
                    path: url_parsed.path,
                    port: url_parsed.port,
                    method: "GET",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.65 Safari/537.36"
                    }
                },function(resp){
                    var data = "";
                    resp.setEncoding("utf8");
                    resp.on("data",function(a){
                        data += a.toString();
                    });
                    resp.on("end",function(){
                        index_assets[asset.path] = { data: data };
                        for(var i in resp.headers){
                            /content-type/i.test(i) && (index_assets[asset.path].mime = resp.headers[i]);
                        }
                        _.defer(get_asset);
                    });
                });
                r.end();
                r.on("error",function(e){
                    console.log("Can't get "+asset.src);
                    process.exit();
                });
            }
            else {
                try {
                    var file_name = m.cfg.path+"/client/assets/"+asset.path;
                    console.log("Reading "+file_name+"...");
                    index_assets[asset.path] = {
                        data: fs.readFileSync(file_name),
                        mime: mime.lookup(file_name)
                    }
                    _.defer(get_asset);
                }
                catch(e){
                    m.error("File '"+asset.path+"' doesn't exists! Exiting...")
                    process.exit();
                }
            }
        }

        get_asset();
    }).done();
};