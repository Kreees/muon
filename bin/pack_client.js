#!/usr/bin/env node

var fs = require("fs"),
    q = require("q"),
    tar = require("tar"),
    zlib = require("zlib"),
    fstream = require("fstream"),
    mime = require("mime"),
    crypt = require("crypto");

var args = require("../lib/bin/pack_client/load_args");



global.__mcfg__ = {};
global.__mcfg__.serverMode = "package";
args.domain && (global.__mcfg__.domain = args.domain);
args.port && (global.__mcfg__.port = args.port);
args.secure && (global.__mcfg__.protocol = args.secure?"https":"http");


require("../module.js");

m.ready(function(){
    var fs_ext = m.utils.fsExt;
    if (!m.cfg.domain) console.log("WARNING! Server domain is not specified.")

    if (!fs.existsSync(args.index_file)) {
        console.error(args.index_file+": file doesn't exists");
        process.exit();
    }
    var packages = require("../lib/bin/pack_client/get_packages");
    var cc = m["client-compiler"];
    require("../lib/bin/pack_client/get_index")(args,function(index_context){
        try{
            var temp_dir = "./"+args.output_name;
            fs.mkdirSync(temp_dir);
            fs.writeFileSync(temp_dir+"/index.html",index_context.data,"utf-8");


            var assets = index_context.assets;
            var req = {
                path: "",
                get: function(){},
                query: {}
            }
            var res = {
                end: function(data){ callback(this.file_path,this.mime,data); },
                set: function(a,b){
                    /content-type/i.test(a) && (this.mime = b);
                }
            }

            fs.mkdirSync(temp_dir+"/pack");
            fs.mkdirSync(temp_dir+"/pack-src");
            fs.mkdirSync(temp_dir+"/pack-translation");
            var packAssetCounter = 0;
            var langs = [];
            var packs = [];


            for(var i in packages){
                (function(i) {
                    packAssetCounter++;
                    for(var tr in packages[i].tr){
                        if (langs.indexOf(packages[i].tr[tr]) == -1) {
                            langs.push(packages[i].tr[tr]);
                        }
                    }

                    if (packages[i].dep_src){
                        packAssetCounter++;
                        (function(dep_src,pack){
                            fs_ext.tree(dep_src,function(files){
                                files.map(function(a){
                                    assets["pack-src/"+pack+"/"+a.replace(RegExp("^"+dep_src),"")] = {
                                        data: fs.readFileSync(a),
                                        mime: mime.lookup(a)
                                    }
                                });
                                callback();
                            })
                        })(packages[i].dep_src,i)
                    }

                    cc.renderPackage(m.plugins.getPlugin(packages[i].plugin),i).then(function(data) {
                        callback("pack/"+i,"text/javascript",data);
                    });

                    packs.push(i)
                    console.log("Compiling "+i+" package...");
                })(i);
            }

            for(var i in langs){
                (function(i){
                    packAssetCounter++;
                    var lang = req.path.replace(/^\//,"");

                    var packs = m.utils._.keys(m.plugins.getPackages());

                    var ret = {};
                    var dfd = Q.defer();
                    var promise = dfd.promise;

                    packs.forEach(function(packName){
                        var fullPackName = packName,
                            packName = fullPackName.split(":").pop();
                        var pluginName = packName.split(":").slice(0,-1).join(":"),
                            plugin = m.plugins.getPlugin(pluginName);
                        promise = promise.then(_.partial(cc.renderTranslation,plugin,packName,lang || m.cfg.defaultLang)).then(function(trs){
                            ret[fullPackName] = trs;
                        });
                    });


                    promise.then(function(){
                        callback("pack-translation/"+langs[i],"application/json",JSON.stringify(ret));
                    }).done();
                    dfd.resolve();

                    console.log("Compiling "+langs[i]+" translation...");
                })(i);
            }

            function callback(path,mime,data){
                if (path) {
                    assets[path] = {
                        data: data,
                        mime: mime
                    };
                }
                packAssetCounter--;

                if (!packAssetCounter) { client_assets_files(); }
            }

            function client_assets_files(){
                fs_ext.tree(m.cfg.path+"/client/assets/",function(files){
                    for(var i = 0, len = files.length; i < len; i++){
                        var file = files[i].replace(RegExp("^"+m.cfg.path+"/client/assets/"),"");
                        if (file in assets) continue;
                        assets[file] = {
                            data: fs.readFileSync(files[i]),
                            mime: mime.lookup(files[i])
                        }
                    }
                    try{ finalize(); }
                    catch(e){
                        m.log(e);
                        process.exit();
                    }
                })
            }

            function finalize(){
                var manifest = {
                    files: {}
                };
                for(var i in assets){
                    var dirs = i.replace(/:/g,"/").split("/");
                    var file_name = dirs.pop();
                    var dir_path = temp_dir;
                    while (dirs.length != 0){
                        var subdir = dirs.shift();
                        dir_path += (/\/$/.test(dir_path)?"":"/")+subdir;
                        if (fs.existsSync(dir_path)) continue;
                        fs.mkdirSync(dir_path);
                    }
                    fs.writeFileSync(dir_path+"/"+file_name,assets[i].data);
                    manifest.files[i] = {
                        mime: assets[i].mime,
                        hash: crypt.createHash("sha256").update(assets[i].data.toString("utf8")).digest("hex")
                    };
                }
                manifest.files["index.html"] = {
                    mime: "text/html",
                    hash: crypt.createHash("sha256").update(index_context.data.toString("utf8")).digest("hex")
                }
                manifest.domain = m.cfg.domain;
                manifest.package = args.default_pack;
                manifest.secure = (m.cfg.protocol.toLowerCase() == "https");
                manifest.hash = crypt.createHash("sha256").update(JSON.stringify(manifest,0,2)).digest("hex");
                fs.writeFileSync(temp_dir+"/manifest.json",JSON.stringify(manifest,0,2));
                console.log("Complete!");
                process.exit();
            }
        }
        catch(e){
            console.log(e);
            process.exit();
        }
    });

});