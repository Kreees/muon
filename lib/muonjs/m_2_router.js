var __routes__ = [];

$.ajaxSetup({beforeSend: function(xhr){xhr.setRequestHeader("Muon-Request","data-request");}});

var __History__ = __b__.History;
__b__.History.prototype.navigate = function(fragment, options) {
    if (!__History__.started) return false;
    if (!options || options === true) options = {trigger: options};
    fragment = this.getFragment(fragment || '');
    this.fragment = fragment;
    var url = this.root + fragment;
    if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);
    } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
            if(!options.replace) this.iframe.document.open().close();
            this._updateHash(this.iframe.location, fragment, options.replace);
        }
    } else {
        return this.location.assign(url);
    }
    if (options.trigger) this.loadUrl(fragment);
};

var __Router__ = __b__.Router.extend({
    initialize: function(){
        for(var i in this.routes){
            __routes__.push({route:i,callback:this[this.routes[i]]});
        }
    },
    history: function(){
        return __history__.slice();
    },
    route: function(r,n,c){
        __routes__ = __routes__.filter(function(o){return (o.route != r);});
        __routes__.push({route:r,callback:c});
        __b__.Router.prototype.route.apply(this,arguments);
    },
    routes: {},
    path: function(){
        return __staticApp__?"/"+location.hash.replace(/^#/,""):location.pathname;
    },
    reload: function(){
        return this.navigate(this.path(),{replace: true,trigger:true});
    },
    navigate: function(url,opts){
        var _this = m.router;
        _.defer(function(){
            opts = opts || {};
            if (!("trigger" in opts)) opts.trigger = true;
            if (!(opts && opts.skip__History__)){
                __history__.push(_this.path());
                __forward__History____ = [];
            }
            url = url.replace(RegExp("^http://"+location.host),"");
            if (url.match(/^\//)){
                if(url.match(/^\/\//)) location = url;
                else __b__.Router.prototype.navigate.apply(this,[url,opts]);
            }
            else {
                __b__.Router.prototype.navigate.apply(this,
                    [_this.path() +(_this.path().match(/\/$/)?"":"/")+ url,opts]);
            }
        });
    },
    back: function(){
        if (__history__.length == 0){
            _.defer(this.navigate,"/",{replace:true,trigger:true,skip__History__: true});
            return false;
        }
        else {
            __forward__History____.unshift(this.path());
            _.defer(this.navigate,__history__.pop(),{replace:true,trigger:true,skip__History__: true});
        }
        return true;
    },
    forward: function(){
        if (__forward__History____.length == 0) return false;
        __history__.push(this.path());
        _.defer(this.navigate,__forward__History____.shift(),{replace:true,trigger:true,skip__History__: true});
        return true;
    }

});

function bindSurrogate(method,self){
    if (typeof method == "string") method = self[method];
    if (!method) return;
    return _.bind(method,self);
};

var toRegExp = function(route){
    return _.isRegExp(route)?route:__b__.Router.prototype._routeToRegExp(route);
};

function __flattenMiddleware__(middl,self){
    return _.flatten([middl]).filter(function(m){return typeof m == "function";}).map(function(f){return _.bind(f,self);});
}

function addPackRoutes(pack,route,mod){
    var flattenMiddleware = function(mid){return __flattenMiddleware__(mid,mod.self);};
    mod.middleware = flattenMiddleware(mod.middleware);
    if (m.packages[pack].parentPack && m.packages[pack].parentPack.middleware )
        mod.middleware = flattenMiddleware(mod.middleware.concat(m.packages[pack].parentPack.middleware));
    m.packages[pack].middleware = mod.middleware;
    if (_.isObject(mod.routes) && !mod.routes.length){
        var routeKeys = _.keys(mod.routes);
        for(var i in routeKeys.reverse())
            addRoute(pack,route,routeKeys[i],bindSurrogate(mod.routes[routeKeys[i]],mod.self),mod.middleware);
    }
    else if (_.isArray(mod.routes)){
        for(var i in mod.routes.reverse()){
            var rObject = mod.routes[i];

            if (_.isString(rObject.package)){
                if (!_.isString(rObject.route)) {
                    throw Error("No route specified for dependency '"+rObject.package+"' in package "+pack);
                }
                var packRoute = prepareRoute(route,rObject.route);
                rObject.package = (m.packages[pack].m.name?m.packages[pack].m.name+":":"")+rObject.package;
                m.router.route(packRoute,rObject.package,m.requirePack(rObject.package,null,pack));
            }
            else {
                var routerMiddleware = flattenMiddleware(mod.middleware.concat(rObject.middleware));
                if (_.isString(rObject.redirect)){
                    addRedirect(pack,route,rObject.route,rObject.redirect);
                }
                else {
                    if (_.isString(rObject.route) || _.isRegExp(rObject.route))
                        addRoute(pack,route,rObject.route, bindSurrogate(rObject.callback,mod.self),
                            routerMiddleware,rObject.page);
                    if (_.isObject(rObject.routes)){
                        var routeKeys = _.keys(rObject.routes);
                        for(var j in routeKeys.reverse()){
                            var callback = bindSurrogate(rObject.routes[routeKeys[j]],mod.self);
                            addRoute(pack,route,routeKeys[j],callback,routerMiddleware,rObject.page);
                        }
                    }
                }
            }
        }
    }
}

function runRouterMiddleware(middleware,callback){
    var self = this;
    if (middleware.length == 0) return callback();
    try {
        $.when(middleware.shift().call(self))
            .then(_.partial(runRouterMiddleware.bind(self),middleware,callback),m.router.back);
    }
    catch(e){
        console.log(e.message);
        m.router.back();
    }
}

function prepareRoute(sections){
    if (!_.isArray(sections)) sections = [].slice.call(arguments);
    var route = "";
    while (sections.length){
        var section = sections.shift();
        section = (section instanceof RegExp)?section:toRegExp(section.replace(/^\//,""));
        section = section.toString().replace(/(^\/\^)|(\$\/$)/g,"");
        route += (route?"/":"")+section;
    }
    return RegExp("^"+route+"$");
};

function addRoute(pack,pref,route,handler,middleware,page){
    if (route === ""){
        m.router.route(prepareRoute(pref),pack+"_"+route+"_redirect", function(){
            m.router.navigate(m.router.path()+"/",{trigger:true,replace:true});
        });
    }
    if (!_.isString(page)){
        var pageRoute = toRegExp(route).toString().replace(/(^\/\^)|(\$\/$)/g,"");
        pageRoute = pageRoute.substr(0,(pageRoute.indexOf("(") == -1)?pageRoute.length:pageRoute.indexOf("("));
        pageRoute = pageRoute.replace(/(^\/)|(\/$)/g,"");
        page = pageRoute.split("/").reverse().join("_");
        if (page.length == 0) page = "index";
    }
    var self = m.packages[pack].packageObject.self;
    m.router.route(prepareRoute(pref,route),pack+"_"+route, function(){
        var _args = arguments;
        var pageToShow = page;
        var appView = m.packages[pack].appView;
        self.currentPage = undefined;
        try{self.currentPage = appView.get(pageToShow+(/_page$/.test(pageToShow)?"":"_page"));}
        catch(e){}
        runRouterMiddleware.call(self,middleware.slice(),function(){
            handler && handler.apply(self,_args);
            do {
                try{ appView.show(pageToShow); }
                catch(e){console.log(e.stack);break;}
                pageToShow = appView.parentAppPage;
            } while(appView = appView.parentAppView);
        });
    });
}

function addRedirect(pack,pref,route,redirectUrl){
    function redirect(){
        m.router.navigate(redirectUrl,{trigger:true,replace:true});
    }
    if (route === ""){
        m.router.route(prepareRoute(pref),pack+"_"+route+"_redirect", function(){
            m.router.navigate(m.router.path()+"/",{trigger:true,replace:true});
        });
    }
    m.router.route(prepareRoute(pref,route),pack+"_"+route,redirect);
}

function __procUnhandledViews__(pack){
    var processed = [];
    $("script[data-pack='"+pack+"'][type='text/muon-template']").each(function(){
        if (processed.indexOf(this) != -1) return;
        processed.push(this);
        $("script#"+this.id+"[data-pack='"+pack+"'][type='text/muon-template']")
            .not(this)
            .each(function(){
                processed.push(this);
            });
        var name = this.id.replace(/_template$/,"");
        var type = name.match(/_([a-zA-Z0-9]*?)$/)[1];
        name = name.replace(RegExp("_"+type+"$"),"");
        if (m.packages[pack].views[type] && m.packages[pack].views[type][name]) return;
        var viewClass = null;
        if (name == "application" && type == "stack")
            viewClass = m.ApplicationStackView;
        else if (name.match(/_page$/) && type == "layout")
            viewClass = m.PageLayoutView;
        else if (type in m.baseViews)
            viewClass = m.baseViews[type];
        if (!viewClass) return;
        viewClass.extend({template: name,package:pack});
    });
}

function __procProfiledViews__(pack){
    $("script[data-pack='"+pack+"'][type='text/muon-template'][data-profile]").each(function(){
        var name = this.id.replace(/_template$/,"");
        var type = name.match(/_([a-zA-Z0-9]*?)$/)[1];
        name = name.replace(RegExp("_"+type+"$"),"");
        var profile = this.getAttribute("data-profile");
        m.packages[pack].views[type][name].profiles = m.packages[pack].views[type][name].profiles || [];
        m.packages[pack].views[type][name].profiles.push(profile);
        if (!(__profiles__[profile] instanceof Array)) __profiles__[profile] = [];
        __profiles__[profile].push("[data-muon='"+name+"_"+type+"'][data-pack='"+pack+"']");
    });
}

var __pendingPackages__ = {};

m.requirePack = function(pack,callback,parentPack){
    if (pack in __pendingPackages__){
        callback && __pendingPackages__[pack].push(callback);
        return fallback;
    }

    var fallbackPath = "";
    var pluginName = pack.substr(0,pack.lastIndexOf(":"));
    var route,fullRoute,packObject;
    callback && (__pendingPackages__[pack] = [callback]);
    callback = function(arg){
        if (__pendingPackages__[pack] instanceof Array){
            while(__pendingPackages__[pack].length != 0){
                if (typeof __pendingPackages__[pack][0] == "function"){
                    try{__pendingPackages__[pack][0](arg)
                    } catch(e){}
                }
                __pendingPackages__[pack].splice(0,1);
            }
            delete __pendingPackages__[pack];
        }
    }


    _.defer(function(){
        var routes = _.where(__routes__,{callback:fallback});
        if (routes.length != 0){
            route = routes[0].route;
            fullRoute = prepareRoute([route,"/*a"]);
            m.router.route(fullRoute,__getUniq__(),fallback);
        }
        else fallback();
    });

    function fallback(){
        fallbackPath = m.router.path();
        if (m.packages[pack] && m.packages[pack].loaded) packLoaded();
        else if (m.packageInitData[pack]) packLoaded();
        else {
            var callbackName = "mpackcallback"+Date.now();
            m[callbackName] = function(){
                _.defer(packLoaded);
                delete m[callbackName];
            };

            try {
                $("<script src='/pack/"+pack+"?muon&lang="+ m.getLanguage()+"&m_callback="+callbackName+"'/>")
                    .appendTo(document.head);
            }
            catch(e){
                m.log("Package load error: "+pack+" : "+ e.message);
                callback(false);
            }
        }
    }

    function postProcLoadedPackage(){
        packObject.inited = true;
        var mod = m.packages[pack].packageObject;
        if (route){            
            __b__.history.handlers = __b__.history.handlers.filter(function(obj){
                if (obj.route.toString() == toRegExp(route).toString() ||
                    obj.route.toString() == toRegExp(fullRoute).toString()) return false;
                return true;
            });
            __routes__ = __routes__.filter(function(obj){ return (obj.callback == fallback)?false:true; });
            addPackRoutes(pack,route,mod);
            mod.useAppView = mod.useAppView || true;
            if (mod.useAppView){
                var appViewClass = null;
                if (packObject.views.stack && m.packages[pack].views.stack.application)
                    appViewClass = packObject.views.stack.application;
                else
                    appViewClass = m.ApplicationStackView.extend({package:pack});
                var appView = packObject.appView = new appViewClass;
                if (__applicationView__ == appView) appView.$el.appendTo("body");
                else {
                    if (m.packages[parentPack]
                        && m.packages[parentPack].appView instanceof m.ApplicationStackView)
                    {
                        var page = new m.PageLayoutView();
                        var pageName = appView.parentAppPage = "m_"+__getUniq__()+"_page";
                        appView.parentAppView = m.packages[parentPack].appView;
                        page.el.appendChild(appView.el);
                        appView.parentAppView.add(pageName,page);
                    }
                }
                appView.addPages(mod.pages || ["*"]);
            }

            _.defer(_.bind(__b__.history.loadUrl,__b__.history));
        }
        callback();
    };

    function initPack(){
        var __prevPackage__ = __currentPackage__;
        var __prevPlugin__ = __currentPlugin__;
        __currentPackage__ = pack;
        __currentPlugin__ = pluginName;

        var pluginObject = __registerPlugin__(__currentPlugin__);

        var modExports = {};

        var mod = m.packageInitData[pack].package(modExports);

        if (mod === undefined) for(var i in modExports) mod[i] = modExports[i];
        else mod = mod.exports;

        packObject.packageObject = mod;
        packObject.translation = m.packageInitData[pack].translation;
        packObject.parentPack = m.packages[parentPack||""];
        mod.self = mod.self || {};
        mod.self.m = __plugins__[pluginName];
        mod.self.cfg = m.packageInitData[pack].cfg;

        packObject.routerPath = route;
        packObject.loaded = true;

        packObject.m = pluginObject;
        pluginObject = __plugins__[""];
        var pluginStack = pluginName.split(":");
        for(var i in pluginStack){
            var shorterName = pack.substr(pack.indexOf(":")+1);
            if (pluginStack[i] != "") pluginObject = pluginObject.plugins[pluginStack[i]];
            pluginObject.packages[shorterName] = packObject;
        }

        for(var i in m.packageInitData[pack].dependencies.style){
            var css = m.packageInitData[pack].dependencies.style[i];
            $("<style />").text(css).appendTo("head");
        }
        for(var i in m.packageInitData[pack].dependencies.script){
            eval(m.packageInitData[pack].dependencies.script[i]);
        }

        for(var i in m.packageInitData[pack].models){
            if (i in m.models) continue;
            else eval(m.packageInitData[pack].models[i]);
        }

        var views = m.packageInitData[pack].views;

        function proc_view(){
            if (views.length == 0) return finalize();
            var view_data = views.shift();
            if (view_data.match(/^<script type='text\/javascript'/) && __serverMode__ == "development"){
                var id = $(view_data).attr("id");
                $("<script />").attr({
                    src: (__staticApp__? "":"/")+"pack_view/"+__currentPackage__+"/"+id+"?muon",
                    type: "text/javascript"
                }).appendTo(document.head);
            }
            else $(view_data).appendTo(document.head);
            proc_view();
        }
        function finalize() {
            __procUnhandledViews__(pack);
            __procProfiledViews__(pack);
            __currentPackage__ = __prevPackage__;
            __currentPlugin__ = __prevPlugin__;
            if (typeof mod.ready == "function")
                try { mod.ready.call(mod.self,postProcLoadedPackage); }
                catch(e){ m.log("Pack load error: ready method error: "+ e.stack); }
            else postProcLoadedPackage();
        }
        proc_view();
    }

    function packLoaded(){
        if (m.packages[pack] instanceof m.MuonPackage) {
            packObject = m.packages[pack];
            postProcLoadedPackage();
        }
        else {
            m.packages[pack] = packObject = new m.MuonPackage(pack);
            initPack();
        }
    }

    return fallback;
};

m.router = new __Router__();
__onReady__.push(function(){
    if ($.browser && $.browser.msie) __staticApp__ = true;
    if (__staticApp__ && !/^file/.test(location.protocol) && location.pathname.replace(/^\//,"")){
        location.pathname = "/";
        return;
    }
    if(__serverMode__ == "testing"){
         if (window.mochaPhantomJS){ 
             mochaPhantomJS.run(); 
         }else { 
             mocha.run(); 
         }
    }else{
        m.router.route("/","#{default_pack}",m.requirePack("application"));
        _.defer(_.bind(__b__.history.start,__b__.history),(__staticApp__?{}:{pushState:true}));
    }
    $("body").addClass("muon").delegate("a[data-route]","click",function(ev){
        ev.preventDefault();
        if (!this.href){
            var route = this.getAttribute("data-route");
            var packName = this.getAttribute("data-pack") || "application";
            if (!(packName in m.packages)) return;
            if (m.packages[packName].routerPath){
                if (route.match(/^\/\//)) route = route.replace(/\/{2,}/g,"/");
                else if (route.match(/^\//))
                    route = (m.packages[packName].routerPath+"/"+route).replace(/\/{2,}/g,"/");
                else route = "~"+route.replace(/\/{2,}/g,"/");
                route = (__staticApp__?"#":"")+route.replace(/\^|\$/g,"");
            }
            $(this).attr("href",route).data("pack",packName);
        }

        var path = this.href;

        if (__staticApp__) path = path.substring(path.indexOf("#")+1,path.length);

        path = path.replace(/(^\s+)|(\s+$)/g,"");
        path = path.replace(this.host,"")
                   .replace(this.protocol+"//","")
                   .replace(/^\/\#/,"")
                   .replace(/^~/,"");
        m.router.navigate(path,{trigger: true});
    });
});