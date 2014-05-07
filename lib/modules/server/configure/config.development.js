module.exports = function(self,deps){
    var appCfg = deps.config.load();
    var express = require("express");
    var _ = require("underscore");
    var Q = require("q");

    return function(app)
    {
        if (appCfg.autoreload)
            app.use(function(req,res,next){
                m.reload().then(next).done();
            });
        app.use(express.logger());
        deps.plugins.getPluginsNames().forEach(function(pluginName){
            var plugin = deps.plugins.getPlugin(pluginName);
            var packs = deps.plugins.getPackages(plugin);
            for(var packName in packs)
                app.use("/pack-src/"+(pluginName.length > 0?pluginName+":":"")+packName, express.static(packs[packName]+"/dependencies/src"));
        });

        app.use("/muon.js",function(req,res){
            res.writeHead(200,{'content-type': 'text/javascript'});
            deps['client-compiler'].renderMuonJS().then(res.end.bind(res)).done();
        });
        app.use(function(req,res,next){
            if (req.get('muon-request') == "data-request" || _.isString(req.query.muon)){
                delete req.query.muon;
                return _.defer(next);
            }
            res.writeHead(200,{'content-type': 'text/html; charset=utf-8'});
            deps['client-compiler'].renderIndex().then(res.end.bind(res)).done();
        });
        app.use("/api",function(req,res){
            deps.api.run(req,res);
        });
        app.use("/pack",function(req,res){
            var pluginName = req.path.replace(/\//g,"").split(":").slice(0,-1).join(":"),
                plugin = deps.plugins.getPlugin(pluginName),
                packName = req.path.replace(/\//g,"").split(":").pop();

            if (!plugin){
                deps.logger.error("No such plugin '"+pluginName+"'");
                res.writeHead(404,{'content-type': 'text/javascript; charset=utf-8'});
                res.end("{}");
            }
            else {
                deps['client-compiler'].renderPackage(plugin,packName).then(function(text){
                    if (req.query.m_callback)
                        text += "\ntry{ m['"+req.query.m_callback+"']();} catch(e){console.log('Callback f called: '+e.message);}";
                    res.writeHead(200,{'content-type': 'text/javascript; charset=utf-8'});
                    res.end(text);
                }).catch(function(e){
                    deps.logger.error(e);
                    res.writeHead(500,{'content-type': 'text/javascript; charset=utf-8'});
                    res.end(e.stack);
                }).done();
            }
        });
        app.use("/pack-view",function(req,res){
            var pluginName = req.path.replace(/^\//g,"").split(":").slice(0,-1).join(":"),

                plugin = deps.plugins.getPlugin(pluginName),
                fullPackName = req.path.replace(/^\//g,"").split("/")[0],
                packageName = fullPackName.split(":").pop(),
                viewName = req.path.replace(/^\//g,"").split("/").slice(1).join("/");

            if (!plugin){
                deps.logger.error("No such plugin '"+pluginName+"'");
                res.writeHead(404,{'content-type': 'text/javascript; charset=utf-8'});
                res.end();
                return;
            }

            if (!(fullPackName in deps.plugins.getPackages(plugin))){
                deps.logger.error("No such package '"+fullPackName+"'");
                res.writeHead(404,{'content-type': 'text/javascript; charset=utf-8'});
                res.end();
                return;
            }

            deps['client-compiler'].renderView(plugin,packageName,viewName).then(function(text){
                res.writeHead(200,{'content-type': 'text/javascript; charset=utf-8'});
                res.end(text)
            }).catch(function(e){
                if (e instanceof deps['client-compiler'].ViewNotExists){
                    res.writeHead(404,{'content-type': 'text/plain; charset=utf-8'});
                    res.end("View is not found: "+pluginName+":"+packageName+":"+viewName);
                }
                else {
                    deps.logger.error(e);
                    res.writeHead(500,{'content-type': 'text/plain; charset=utf-8'});
                    res.end(e.stack);
                }
            }).done();
        });
        app.use("/pack-translation",function(req,res){
            var lang = req.path.replace(/^\//,"");
            if (!lang) {
                m.errorize(res,500,"language is not specified");
                return;
            }

            var allPackages = _.keys(deps.plugins.getPackages());

            var packs = _.union(_.compact((req.query.packs || "").split(",")));
            if (packs.length == 0) packs = allPackages;

            var ret = {};
            var abortFlag = false;
            var dfd = Q.defer();
            var promise = dfd.promise;

            packs.forEach(function(packName){
                if (abortFlag) return;
                if (allPackages.indexOf(packName) == -1){
                    deps.logger.error("No such package '"+packName+"'");
                    res.writeHead(404,{'content-type': 'text/plain; charset=utf-8'});
                    res.end("No such package '"+packName+"'");
                    abortFlag = true;
                    return;
                }
                var fullPackName = packName,
                packName = fullPackName.split(":").pop();
                var pluginName = packName.split(":").slice(0,-1).join(":"),
                    plugin = deps.plugins.getPlugin(pluginName);
                promise = promise.then(_.partial(deps['client-compiler'].renderTranslation,plugin,packName,lang || appCfg.defaultLang)).then(function(trs){
                    ret[fullPackName] = trs;
                });
            });

            if (abortFlag) return;

            promise.then(function(){
                res.writeHead(200,{"content-type": "application/json; charset=utf-8"});
                res.end(JSON.stringify(ret));
            }).catch(function(e){
                deps.logger.error(e);
                res.writeHead(500,{"content-type": "text/plain; charset=utf-8"});
                res.end(e.stack);
            }).done();
            dfd.resolve();
        });
    }
}