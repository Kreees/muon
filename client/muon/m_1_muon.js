var __b__ = window.Backbone;
delete window.Backbone;

function __serializeObject__(obj) {
    var str = [];
    for(var p in obj)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    return str.join("&");
}

var __MuonBase__ = {
    __projections__: {},
    packages: {},
    models: {},
    plugins: {},
    collections: {},
    dependencies: [],
    baseViews: {}
};

var __MuonPackBase__ = {
    views: {},
    viewsUnnamed: {},
    routerPath: null,
    loaded: false,
    translation: {}
};

var __syncNames__ = {},
    __defaultLang__ = document.getElementsByTagName("html")[0].lang || "en",
    __debug__ = false,
    __profiles__ = {},
    __plugins__ = {},
    __history__ = [],
    __forwardHistory__ = [],
    __currentPackage__ = "",
    __currentPlugin__ = "",
    __onReady__ = [],
    __staticApp__ = false,
    __basePackage__ = "application",
    __applicationView__ = null,
    __viewBackboneExtend__ = __b__.View.extend,
    __modelBackboneExtend__ = __b__.Model.extend,
    __collectionBackboneExtend__ = __b__.Collection.extend
;

function __mDeepExtend__(dst,src){
    for(var i in src){
        if (src[i] instanceof Function) { dst[i] = src[i]; continue; }
        if (src[i] instanceof Array) { dst[i] = src[i].slice(); continue; }
        if (src[i] instanceof Object) { dst[i] = Object.create(src[i]); __mDeepExtend__(dst[i],src[i]); continue;}
        dst[i] = src[i];
    }
}

function __getUniq__(){return Math.floor(Math.random()*9*Math.pow(10,9)+Math.pow(10,9));}
function MuonPlugin (name){ __mDeepExtend__(this,__MuonBase__); this.name = name; };
function MuonPackage (name){ __mDeepExtend__(this,__MuonPackBase__); this.name = name; };

_.extend(MuonPlugin.prototype,{
    getProjection: function(key){
        return this.__projections__[key];
    },
    setProjection: function(key,val){
        this.__projections__[key] = val;
        $(this).trigger("projection_updated."+key);
    },
    removeProjection: function(key){
        try{
            var ret = this.__projections__[key];
            delete this.__projections__[key];
            $(this).trigger("projection_removed."+key);
            return ret;
        }
        catch(e){ return console.log(e.message, e.stack);}
    }
});

var m = _.extend(new    MuonPlugin(""),{
    packageInitData: {},
    MuonPackage: MuonPackage,
    MuonPlugin: MuonPlugin,
    isDebug: function(){
        return __debug__;
    },
    setDebug: function(arg){
        __debug__ = !!arg;
        if (!__debug__) $("body").removeClass("debug");
        else{
            /debug/.test(document.body.className) && (document.body.className += " debug");
            $("*[data-muon]").each(function(){
                if (this.muonView instanceof m.View) this.muonView.__renderDebugLabels__();
            });
        }
    },
    setLanguage: function(lang){
        document.getElementsByTagName("html")[0].lang = lang || __defaultLang__;
        var packs = [];
        for(var i in m.packages){
            packs.push(i);
        }
        $.getJSON("/pack_translation/"+lang,{packs:packs.join(",")}).then(function(obj){
            for(var i in obj){
                if (!(i in m.packages)) continue;
                m.packages[i].translation = obj[i];
            }
            $("[data-muon]").each(function(){
                if (this.muonView instanceof m.View) {
                    this.muonView.__renderTranslation__();
                }
            });
        });
    },
    getLanguage: function(){ return document.getElementsByTagName("html")[0].lang || __defaultLang__; },
    setProfile: function(profile,flag){
        if (profile == "muon") return;
        _.defer(function(){
            if (flag === false){ return m.removeProfile(profile); }
            if (m.hasProfile(profile)) return;
            var className = document.body.className.split(/\s+/);
            className = className.concat(profile.split("."));
            document.body.className = className.sort().join(" ");
            var profilesToFilter = _.keys(__profiles__).filter(function(p){
                return RegExp(profile.split(".").sort().join(".([a-zA-Z0-9_]+.)*?")).test(p);
            });
            profilesToFilter = profilesToFilter.filter(function(p){return m.hasProfile(p);});
            if (profilesToFilter.length == 0) return;
            var templates = [];
            for(var i in profilesToFilter){
                templates = templates.concat(__profiles__[profilesToFilter[i]]);
            }
            $("[data-muon]").filter(templates.join(",")).each(function(){
                if (this.muonView instanceof m.View) this.muonView.reload();
            });
        });
    },
    removeProfile: function(profile){
        if (profile == "muon") return;
        _.defer(function(){
            if (!m.hasProfile(profile)) return;
            var profilesToFilter = _.keys(__profiles__).filter(function(p){
                return RegExp(profile.split(".").sort().join(".([a-zA-Z0-9_]+.)*?")).test(p);
            });
            profilesToFilter = profilesToFilter.filter(function(p){return m.hasProfile(p);});
            if (profilesToFilter.length == 0) return;
            var templates = [];
            for(var i in profilesToFilter){
                templates = templates.concat(__profiles__[profilesToFilter[i]]);
            }
            $("body").removeClass(profile);
            $("[data-muon]").filter(templates.join(",")).each(function(){
                if (this.muonView instanceof m.View) this.muonView.reload();
            });
        });
    },
    hasProfile: function(profile){
        return RegExp(profile.split(".").sort().join(".([a-zA-Z0-9_]+.)*?")).
            test(document.body.className.split(/\s+/).sort().join("."));
    },
    getProfile: function(){
        return document.body.className.split(/\s+/).sort().join(".");
    },
    log: function(){
        console.log.apply(console,arguments);
    },
    error: function(){
        console.error.apply(console,arguments);
    }
});
m.packages[""] = new m.MuonPackage("");
__plugins__[""] = m;


function __registerPlugin__(plugin){
    if (plugin in __plugins__) return __plugins__[plugin];
    var plStack = plugin.split(":");
    var plObject = m;
    var tempPlName = "";
    for(var i in plStack){
        var plName = plStack[i];
        if (plName in plObject.plugins) { plObject = plObject.plugins[plName]; continue; }
        tempPlName += tempPlName?tempPlName+":":"" + plName;
        plObject.plugins[plName] = new m.MuonPlugin(tempPlName);
        plObject = plObject.plugins[plName];
    }
    __plugins__[plugin] = plObject;
    return plObject;
}

$(function(){for(var i in __onReady__) try{__onReady__[i]()} catch(e){m.error(e);}; delete __onReady__;});
window.muon = window.m = m;