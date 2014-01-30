#!/usr/bin/env node

require("../module.js");
var fs = require("fs"),
    q = require("q"),
    tar = require("tar"),
    zlib = require("zlib"),
    fstream = require("fstream"),
    fs_ext = require("../lib/utils/fs/fs_ext"),
    mime = require("mime"),
    crypt = require("crypto");



m.ready(function(){
    var serverHandler = m.server();
    var args = require("../lib/bin/pack_client/load_args");
    if (!fs.existsSync(args.index_file)) m.error(e.message);

    var packages = require("../lib/bin/pack_client/get_packages");
    require("../lib/bin/pack_client/get_index")(args,function(index_context){
try{
        var temp_dir = "./"+args.output_name;
        fs.mkdirSync(temp_dir);
        fs.writeFile(temp_dir+"/index.html",index_context.data,"utf-8");

        var assets = index_context.assets;

        var req = {
            path: "",
            get: function(){},
            query: {}
        }
        var res = {
            end: function(data){
                callback(this.file_path,this.mime,data);
            },
            set: function(a,b){
                /content-type/i.test(a) && (this.mime = b);
            }
        }

        fs.mkdirSync(temp_dir+"/pack");
        fs.mkdirSync(temp_dir+"/pack_src");
        fs.mkdirSync(temp_dir+"/pack_translation");
        var pack_data_counter = 0;
        var langs = [];
        var packs = [];
        for(var i in packages){
            var req = Object.create(res);
            var res = Object.create(req);
            req.path = "/"+i;
            res.file_path = "pack/"+i;
            req.query = {lang:"ru"};
            serverHandler.server.packageRender(req,res);
            pack_data_counter++;

            packs.push(i)
            for(var tr in packages[i].tr){
                if (langs.indexOf(packages[i].tr[tr]) == -1) langs.push(packages[i].tr[tr]);
            }

            if (packages[i].dep_src)
                (function(dep_src,pack){
                    fs_ext.tree(dep_src,function(files){
                        files.map(function(a){
                            assets["pack_src/"+pack+"/"+a.replace(RegExp("^"+dep_src),"")] = {
                                data: fs.readFileSync(a),
                                mime: mime.lookup(a)
                            }
                        });
                    })
                })(packages[i].dep_src,i)

        }

        for(var i in langs){
            var req = Object.create(res);
            var res = Object.create(req);
            req.path = "/"+langs[i];
            res.file_path = "pack_translation/"+langs[i];
            req.query = {packs:packs.join(",")};
            serverHandler.server.packageTranslation(req,res);
            pack_data_counter++;
        }

        function callback(path,mime,data){
            assets[path] = {
                data: data,
                mime: mime
            };
            pack_data_counter--;

            if (!pack_data_counter) client_assets_files();
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
                    process.kill();
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
            manifest.domain = args.domain;
            manifest.package = args.default_pack;
            manifest.secure = args.secure;
            manifest.hash = crypt.createHash("sha256").update(JSON.stringify(manifest,0,2)).digest("hex");
            fs.writeFileSync(temp_dir+"/manifest.json",JSON.stringify(manifest,0,2));
            process.exit();
        }
}
catch(e){
    m.log(e);
    process.kill();
}
    });

});
