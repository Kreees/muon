var cheerio = require("cheerio"),
    fs = require("fs"),
    http = require("httpsync"),
    mime = require("mime");

module.exports = function(args,callback){
    var index_html = fs.readFileSync(args.index_file,"utf-8");
    var $ = cheerio.load(index_html);

    var assets = {};
    var index_assets = {};

    $("html").attr("lang",m.cfg.default_lang || "en");
    $("html").append("<script>m && (m.__staticApp__ = true,"+
        "m.__basePackage__ = '"+args.default_pack+"',"+
        "m.__domain__ = '"+args.domain+"',"+
        "m.__protocol__ = '"+(args.secure?"https":"http")+"');</script>");

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
            else{
                assets[attr] = {
                    path: attr.replace(/^\//,""),
                };
            }
            $(el).attr(attr_name,assets[attr].path);
        });
    });

    for(var i in assets){
        var asset = assets[i];
        if (asset.remote){
            console.log("Retriving "+asset.protocol+":"+asset.src+" ...");
            var r = http.request({
                url: asset.protocol+":"+asset.src,
                method: "GET",
                useragent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.65 Safari/537.36"
            });
            var resp = r.end();
            index_assets[asset.path] = { data: resp.data };
            for(var i in resp.headers){
                /content-type/i.test(i) && (index_assets[asset.path].mime = resp.headers[i]);
            }
        }
        else {
            try {
                var file_name = (asset.path == "muon.js")? m.__sys_path+"/client/muon.js/muon.js" : m.cfg.path+"/client/assets/"+asset.path;
                index_assets[asset.path] = {
                    data: fs.readFileSync(file_name),
                    mime: mime.lookup(file_name)
                }
            }
            catch(e){
                m.error("File '"+asset.path+"' doesn't exists! Exiting.")
            }
        }
    }

    return {
        assets: index_assets,
        data: $.html()
    };
}