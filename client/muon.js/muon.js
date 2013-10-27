/**
 * Here you can put all common part of your CSS code.
 *
 * @file
 * @name assets/js/muon.js
 *
 */

(function(_b_){
    function serializeObject(obj) {
        var str = [];
        for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        return str.join("&");
    }

//    var $ = function(){
    // DOM Function
//    }

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

    var __syncNames__ = {};

    var __defaultLang__ = document.getElementsByTagName("html")[0].lang || "en";
    var __debug__ = false, __profiles__ = {}, __routes__ = [],
        __plugins__ = {}, __history__ = [], __forwardHistory__ = [];

    function __mDeepExtend__(dst,src){
        for(var i in src){
            if (src[i] instanceof Function) { dst[i] = src[i]; continue; }
            if (src[i] instanceof Array) { dst[i] = src[i].slice(); continue; }
            if (src[i] instanceof Object) { dst[i] = Object.create(src[i]); __mDeepExtend__(dst[i],src[i]); continue;}
            dst[i] = src[i];
        }
    }

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

    var m = _.extend(new MuonPlugin(""),{
        __packageInitData__: {},
        __basePackage__: "application",
        __staticApp__: false,
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
                console.log(__profiles__);
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
        }
    });

    m.MuonPlugin = MuonPlugin;
    m.__currentPackage__ = "";
    m.__currentPlugin__ = "";
    m.packages[""] = new MuonPackage("");
    __plugins__[""] = m;
    __plugins__[undefined] = m;

    function __registerPlugin(plugin){
        if (plugin in __plugins__) return __plugins__[plugin];
        var plStack = plugin.split(":");
        var plObject = m;
        var tempPlName = "";
        for(var i in plStack){
            var plName = plStack[i];
            if (plName in plObject.plugins) { plObject = plObject.plugins[plName]; continue; }
            tempPlName += tempPlName?tempPlName+":":"" + plName;
            plObject.plugins[plName] = new MuonPlugin(tempPlName);
            plObject = plObject.plugins[plName];
        }
        __plugins__[plugin] = plObject;
        return plObject;
    }

    var __viewBackboneExtend__ = _b_.View.extend;
    var __modelBackboneExtend__ = _b_.Model.extend;
    var __collectionBackboneExtend__ = _b_.Collection.extend;

    _b_.View.extend = function(obj,common){
        var viewType = (_.isString(obj.viewType))?obj.viewType:this.prototype.viewType;
        obj.package = obj.package || m.__currentPackage__ || this.prototype.package || m.__basePackage__;
        obj.plugin = obj.plugin || m.__currentPlugin__  || this.prototype.plugin || "";
        obj.m = __registerPlugin(obj.plugin);
        var newView = __viewBackboneExtend__.apply(this,arguments);
        if (obj.__autoGenerated__) return newView;
        var template = newView.prototype.template;
        if (typeof template == "string"){
            if (!_.isObject(m.packages[m.__currentPackage__].views[viewType]))
                m.packages[m.__currentPackage__].views[viewType] = {};
            m.packages[m.__currentPackage__].views[viewType][template] = newView;
        }
        else {
            if (!_.isArray(m.packages[m.__currentPackage__].viewsUnnamed[viewType]))
                m.packages[m.__currentPackage__].viewsUnnamed[viewType] = [];
            m.packages[m.__currentPackage__].viewsUnnamed[viewType].push(newView);
        }
        newView.prototype.super = this.prototype.constructor.prototype;
        newView.profiles = [];
        if (viewType && !m.baseViews[viewType]) m.baseViews[viewType] = newView;
        return newView;
    };

    _b_.Model.extend = function _modelExtend(obj,common){
        var modelName = "";
        if (typeof obj.modelName == 'string'){
            modelName = ((this.prototype.modelName?this.prototype.modelName+".":"")+obj.modelName).replace(/\.+/,".");
        }
        else modelName = this.prototype.modelName;
        if (obj.urlRoot && obj.urlRoot.indexOf("0.0.0.0") != -1){
            obj.urlRoot = obj.urlRoot.replace(/0\.0\.0\.0(:\d+)?/, m.__domain__?m.__domain__:location.host);
            if (m.__protocol__) obj.urlRoot = obj.urlRoot.replace(/^http:\/\//, m.__protocol__+"://");
        }
        var _newModel = __modelBackboneExtend__.apply(this,arguments);
        _newModel.modelName = modelName;
        if (obj.__autoGenerated__) return _newModel;
        if (_.isString(modelName)) {
            var attrId = _newModel.prototype.idAttribute;
            var _objs = {};
            function child(attrs,opts){
                attrs = attrs || {};
                if (typeof attrs === "string" || typeof attrs === "number"){
                    var _id = attrs;
                    if (!(_id in _objs)){
                        attrs = {}; attrs[attrId] = _id;
                        var obj = new _newModel(attrs,opts);
                        _objs[_id] = obj;
                    }
                    else {
                        var obj = _objs[_id];
                    }
                    if (opts && opts.forceSync) obj.fetch();
                    return _objs[_id];
                }
                if (typeof attrs._id === "string" || typeof attrs._id === "number"){
                    if (attrs._id in _objs) _objs[attrs._id].set(attrs);
                    else _objs[attrs._id] = new _newModel(attrs,opts);
                    return _objs[attrs._id];
                }
                return new _newModel(attrs,opts);
            };
            child.prototype = _newModel.prototype;
            child.prototype.constructor = child;
            _.extend(child,_newModel);

            child.__objects__ = _objs;
            child.modelName = modelName;

            m.models[modelName] = child;
            var pluginName = modelName.substr(0,modelName.lastIndexOf(":"));
            var pluginObject =  __registerPlugin(pluginName);
            child.prototype.m = pluginObject;
            pluginObject = __plugins__[""];
            var pluginStack = pluginName.split(":");
            for(var i in pluginStack){
                var shorterName = modelName.substr(modelName.indexOf(":")+1);
                if (pluginStack[i] != "") pluginObject = pluginObject.plugins[pluginStack[i]];
                pluginObject.models[shorterName] = child;
                pluginObject["model_"+shorterName.replace(/[:\.]/g,"_")] = child;
            }
            return child;
        }
        return _newModel;

    };

    _b_.Collection.extend = function(obj,common){
        var _collectionUrl = (_.isString(obj.url))?obj.url:this.prototype.url;
        var _newCollection = __collectionBackboneExtend__.apply(this,arguments);
        if (obj.__autoGenerated__) return _newCollection;
        if (_.isString(_collectionUrl)) m.collections[_collectionUrl] = _newCollection;
        _newCollection.prototype.super = this.prototype.constructor.prototype;
        return _newCollection;
    };

    function getUniq(){
        return Math.floor(Math.random()*9*Math.pow(10,9)+Math.pow(10,9));
    }

    m.Model = _b_.Model.extend({
            idAttribute: "_id",
            initialize: function(data){
                var _this = this;
                this.__syncName__ = "mod_"+Math.floor(Math.random()*10000);
                this.on("change:"+this.idAttribute,function(){
                    if (_this.constructor.__objects__){
                        delete _this.constructor.__objects__[_this.previousAttributes[_this.idAttribute]];
                        _this.constructor.__objects__[_this.id] = _this;
                    }
                });
                if (typeof this.init == "function") this.init(data);
            },
            fetch: function(args){
                var dfd = $.Deferred();
                var _this = this;
                _b_.Model.prototype.fetch.call(this,{
                    success: function(){
                        if (args) if ('function' === typeof args.success) args.success.apply(_this,arguments);
                        dfd.resolve(_this);
                    },
                    error: function(){
                        if (args) if ('function' === typeof args.error) args.error.apply(_this,arguments);
                        dfd.reject(arguments);
                    }
                });
                return dfd.promise();
            },
            save: function(obj,args){
                var dfd = $.Deferred();
                var _this = this;
                _b_.Model.prototype.save.call(this,obj,{
                    success: function(){
                        if (args) if ('function' === typeof args.success) args.success.apply(_this,arguments);
                        dfd.resolve(_this);
                    },
                    error: function(){
                        if (args) if ('function' === typeof args.error) args.error.apply(_this,arguments);
                        dfd.reject(arguments);
                    }
                });
                return dfd.promise();
            },
            action: function(action,argsObj,opts){
                var _this = this;
                argsObj = argsObj || {};
                argsObj.__action__ = action;
                opts = opts || {};
                var s = opts.success,
                    e = opts.error;
                opts.success = function(){s && s.apply(_this,arguments);};
                opts.error = function(){e && e.apply(_this,arguments);};
                opts.data = argsObj;
                return $.ajax((typeof this.url == "function")?this.url():this.url,opts);
            },
            destroy: function(args){
                var dfd = $.Deferred();
                var _this = this;
                _b_.Model.prototype.destroy.call(this,{
                    success: function(){
                        if (args) if ('function' === typeof args.success) args.success.apply(_this,arguments);
                        delete _this.constructor.__objects__[_this.id];
                        dfd.resolve(_this);
                    },
                    error: function(){
                        if (args) if ('error' === typeof args.error) args.error.apply(_this,arguments);
                        dfd.reject(arguments);
                    }
                });
                return dfd.promise();
            }
        },
        {
            collection: function(objSearchParams){
                objSearchParams = serializeObject(objSearchParams || {});
                if (objSearchParams) objSearchParams = "?__action__=search&"+objSearchParams;
                return new m.Collection([],{
                    url: this.prototype.urlRoot+objSearchParams,
                    model: this
                });
            }
        }
    );

    /**
     * Об
     * @type {*}
     */
    m.Collection = _b_.Collection.extend({
        initialize: function(models,options){
            options = options || {};
            for(var i in options) this[i] = options[i];
            if (typeof this.model === "string"){
                if (!(this.model in m.models)) throw Error("Unknown model: "+this.model);
                this.model = m.models[this.model];
            }
            this.modelName = this.model.modelName || this.model.prototype.modelName;
            this.setComparator(this.comparator);
            var _ = this;
            this.__syncName__ = "col_"+Math.floor(Math.random()*10000);
            __syncNames__[this.__syncName__] = this;
            setTimeout(function(){
                for(var i in __syncNames__){
                    if ((__syncNames__[i] == _) && (i != _.__syncName__)){
                        _.keep = true;
                        delete __syncNames__[_.__syncName__];
                        _.__syncName__ = i;
                    }
                }
            },0);
            if (typeof this.init == "function") this.init(arguments);

        },
        setComparator: function(c){
            if (this._comparator == c) return;
            this._comparator = c;
            if (('string' == typeof c) && (c.match(/\-\w+/))){
                var _c = c;
                _c = _c.substr(1,_c.length);
                this.comparator = function(a,b){
                    if (a.get(_c) == b.get(_c)) return 0;
                    if (a.get(_c) > b.get(_c)) return -1;
                    else return 1;
                };
            }
            else this.comparator = c;
            this.sort();
        },
        fetch: function(args){
            var dfd = $.Deferred();
            var _this = this;
            _b_.Collection.prototype.fetch.call(this,{
                success: function(){
                    if (args) if ('function' === typeof args.success) args.success.apply(_this,arguments);
                    dfd.resolve(_this);
                },
                error: function(){
                    if (args) if ('function' === typeof args.error) args.error.apply(_this,arguments);
                    dfd.reject(arguments);
                }
            });
            return dfd.promise();
        }
    });

    (function(m){
        function profileSort(a,b){
            if (a.split(".").length > b.split(".").length) return -1;
            if (a.split(".").length < b.split(".").length) return 1;
            return 0;
        }

        m.templateForView = function(view) {
            var selector = view.template+"_"+view.viewType;
            var profile = "muon";
            view.constructor.profiles = view.constructor.profiles.sort(profileSort);
            for(var i in view.constructor.profiles){
                if (m.hasProfile(view.constructor.profiles[i]))
                {
                    profile = view.constructor.profiles[i];
                    break;
                }
            }
            selector = "script#"+selector+"_template";
            selector += "[type='text/muon-template'][data-pack='"+view.package+"']";
            selector += "[data-profile='"+profile+"']";
            if (document.querySelectorAll) return document.querySelector(selector);
            else return $(selector)[0];
        };

        function _attrsParser(attrs){
            var ret = {};
            var tempAttrs = attrs || "";
            tempAttrs = tempAttrs.split(";");
            for(var i in tempAttrs){
                var attr = tempAttrs[i].split(":");
                if (attr.length != 2) continue;
                ret[attr[0].replace(/^\s+/,"").replace(/\s+$/,"")] = attr[1].replace(/^\s+/,"").replace(/\s+$/,"");
            }
            return ret;
        }
        var procProjection = {
            collection: function(el,collectionName,projection){
                var collAttrs = _attrsParser(el.dataset["contextAttrs"]);
                if (typeof collAttrs.model === "string"){
                    if (!(collAttrs.model in m.models)) throw Error("Unknown model: "+collAttrs.model);
                    collAttrs.model = m.models[collAttrs.model];
                }
                if (projection instanceof m.Collection) return _.extend(projection,collAttrs);
                var Collection = m.collections[collectionName] || m.Collection;
                var dfd = $.Deferred();
                if (_.isArray(projection)){
                    var coll = new Collection([],collAttrs);
                    for(var i in projection){
                        var el = projection[i];
                        if (typeof el == "string" || typeof el == "number" || _.isObject(el)){
                            coll.add(new Collection.prototype.model(el));
                        }
                    }
                    return coll;
                }
                if (projection === undefined){
                    var coll = new Collection([],collAttrs);
                    coll.fetch();
                    return coll;
                }
                _.defer(dfd.reject,"Wrong projection type");
                return dfd.promise();
            },
            model: function(el,modelName,projection){
                var modelAttrs = _attrsParser(el.dataset["contextAttrs"]);
                modelAttrs.__autoGenerated__ = true;
                if (projection instanceof m.Model) return _.extend(projection,modelAttrs);
                if (!(modelName in m.models) && !(modelName in this.m.models)) throw Error("Unknown model name: "+modelName);
                var Model = m.models[modelName] || this.m.models[modelName];
                if (el.dataset.contextAttrs) Model = Model.extend(modelAttrs);
                var dfd = $.Deferred();
                if ((typeof projection == "string" || typeof projection == "number" || projection) && el.dataset.modelId)
                    throw Error("You shouldn't use both projection variable and model Id attribute in one view simultaneously.");
                if (typeof projection == "string" || typeof projection == "number" ){
                    _.defer(dfd.resolve,new Model(projection,{forceSync: true}));
                    return dfd.promise();
                }
                if (typeof el.dataset.modelId == 'string'){
                    _.defer(dfd.resolve,new Model(el.dataset.modelId,{forceSync: true}));
                    return dfd.promise();
                }
                if (_.isObject(projection) || projection === undefined){
                    return new Model();
                }
                _.defer(dfd.reject,"Wrong projection type");
                return dfd.promise();
            },
            layout: function(el,non,projection){
                return _.extend(projection,_attrsParser(el.dataset["contextAttrs"]));
            },
            stack: function(el,non,projection){
                return _.extend(projection,_attrsParser(el.dataset["contextAttrs"]));
            },
            widget: function(el,non,projection){
                return _.extend(projection,_attrsParser(el.dataset["contextAttrs"]));
            }
        };

        m.getViewNameByType = function(viewType,viewName,_contextName,pack,recursive){
            pack = pack || m.__basePackage__;
            _contextName = _contextName || "";
            pack = pack || m.__basePackage__;
            try{
                var View = null;
                if (!View && !recursive) View = m.packages[pack].views[viewType][viewName];
                if (!View && (viewType == "model" || viewType == "collection") && _contextName){
                    var contextName = _contextName.replace(/:/g,".").split("."), _viewName = viewName;
                    for(var i in contextName) _viewName = _viewName.replace(RegExp("_"+contextName[i]+"$"),"");
                    if (_viewName != viewName) return m.getViewNameByType(viewType,_viewName,_contextName,pack,true);
                }
                if (!View && (viewType == "model" || viewType == "collection") && _contextName){
                    var contextName = _contextName.replace(/:/g,".").split(".").reverse().join("_");
                    while(!m.packages[pack].views[viewType][viewName+"_"+contextName] && contextName.length != 0){
                        var prevName = contextName;
                        contextName = contextName.replace(/^[a-zA-Z0-9]+_/,"");
                        if (prevName == contextName) contextName = "";
                    }
                    View = m.packages[pack].views[viewType][viewName+(contextName?"_":"")+contextName];
                }
                if (!View && recursive) View = m.packages[pack].views[viewType][viewName];
                if (!View) throw Error();
                return View;
            }
            catch(e){
                if (_contextName.indexOf(":") == -1) throw Error("Wrong view name:"+viewName+"_"+viewType+":"+_contextName+":"+ e.message);
                else return m.getViewNameByType(viewType,viewName,_contextName.substr(_contextName.indexOf(":")+1),pack,true);

            }
        };

        function checkPresenceInDom(el){
            while (el.parentElement) {
                if (el.parentElement == document.body) return true;
                else el = el.parentElement;
            }
            return false;
        }

        function insertView(el,viewType,pack,parentView){
            var _this = this;
            var projection = el.dataset["projection"];
            var viewName = el.dataset[viewType+"View"];
            if (viewName == "data-"+viewType+"-view") viewName = "";
            if (projection){
                var mPlugin = m.getProjection(projection)?m:parentView.m;
                $(mPlugin).one("projection_updated."+projection, function(){
                    if (!checkPresenceInDom(el)) return;
                    insertView.apply(_this,[el,viewType,pack,parentView,mPlugin]);
                });
                $(mPlugin).one("projection_removed."+projection,function(){
                    if (el.muonView instanceof m.View) el.muonView.remove();
                    $(mPlugin).one("projection_updated."+projection, function(){
                        if (!checkPresenceInDom(el)) return;
                        insertView.apply(_this,[el,viewType,pack,parentView,mPlugin]);
                    });
                });
                projection = mPlugin.getProjection(projection);
                if (projection === undefined) return;
            }

            setTimeout(function(){
                if (el.muonView instanceof m.View){
                    el.muonView.remove();
                    delete el.muonView;
                }
                try{
                    $.when(procProjection[viewType].call(_this,el,el.dataset["context"],projection)).
                        then(function(context){
                            try {
                                context = context || {};
                                var View = m.getViewNameByType(viewType,viewName,context.modelName,pack);
                                var viewAttrs = _attrsParser(el.dataset["viewAttrs"]);
                                viewAttrs.__autoGenerated__ = true;
                                viewAttrs.package = pack;
                                viewAttrs.plugin = _this.plugin;
                                new (View.extend(viewAttrs))(context,el);
                            }
                            catch(e){
                                console.log(parentView.template,el);
                                console.debug(e.stack);
                            }
                        });
                }
                catch(e){
                    console.log(parentView.template,el);
                    console.debug(e.stack);
                }
            },0);

            this.innerHTML = "";
        }

        function getTranslation(el){
            var translation = this.pack().translation[this.template+"_"+this.viewType+":"+el.dataset.tr];
            if (m.isDebug() && !translation) {$(el).addClass("untranslated");}
            else {$(el).removeClass("untranslated");}
            return translation || (m.isDebug()?"untranslated":"");
        }

        function renderFocus(){
            var counter = 1;
            this.$("[data-focus]").each(function(){
                $(this).attr("tabindex",counter++);
            });
        }

        m.View = _b_.View.extend({
            tagName: "div",
            profiles: [],
            toString: function(){
                return this.package+":"+this.viewType+":"+this.template;
            },
            initialize:function(context,_el_){
                this.context = context || {};
                if (_el_ && _el_.nodeName) {
                    this.__forcedElement__ = true;
                    this.el = _el_;
                    this.el.muonView = this;
                }
                if (typeof this.init == "function") this.init.apply(this,arguments);
                this.render();
            },
            renderTemplate: function(el){
                if (this.template){
                    var template = m.templateForView(this);
                    if (!template) return;
                    $(el).jqoteapp(template.innerHTML,this.context);
                }
            },
            __renderDebugLabels__: function(){
                if (!m.isDebug() || this.debugLabel) return;
                this.debugLabel = $("<div data-debug/>").text(this.package+":"+this.viewType+":"+(this.template||""))
                    .appendTo(this.el);
                this.debugLabel.click(function(){
                    $(this).toggleClass("pinned");
                    $(this).parent().toggleClass("pinned");
                });
                this.__renderTranslation__();
            },
            __renderTranslation__: function(){
                var _this = this;
                var innerTrs =  this.$el.find("*[data-muon] *[data-tr]");
                this.$el.find("*[data-tr]").not(innerTrs).each(function(){
                    try{ this.innerHTML = getTranslation.call(_this,this); }
                    catch(e){ console.log(e); }
                    if (!m.isDebug()) return;
                    this.debugLabel = $("<div data-debug/>").text(_this.package+":"+_this.template+"_"+_this.viewType+":"+this.dataset.tr)
                        .appendTo(this);
                });
            },
            __renderDataRoutes__: function(){
                var _this = this;
                this.$el.find("a[data-route]").each(function(){
                    var route = this.dataset.route;
                    var packName = this.dataset.pack || _this.package;
                    if (!(packName in m.packages)) return;
                    if (m.packages[packName].routerPath){
                        route = (m.packages[packName].routerPath+"/"+route).replace(/\/{2,}/g,"/");
                        route = route.replace(/\^|\$/g,"");
                    }
                    $(this).attr("href",route)
                        .attr("data-pack",packName);
                });
            },
            __renderDependencySrc__: function(){
                var _this = this;
                var innerSrc =  this.$el.find("*[data-muon] *[data-src]");
                this.$el.find("*[data-src]").not(innerSrc).each(function(){
                    this.src = "/pack_src/"+_this.package+"/"+this.dataset["src"]+"?muon";
                });
                if (m.__staticApp__)
                    ["src","href"].map(function(a){
                        $("["+a+"]",_this.el).each(function(){
                            if (!/^\/\//.test($(this).attr(a))) $(this).attr(a,$(this).attr(a).replace(/^\//,""));
                        });
                    });
            },
            render:function(){
                var _this = this;
                var tagName = this.tagName || "div";
                var $el = $("<"+tagName+" />");
                this.renderTemplate($el[0]);
                if (this.el && this.el.muonView == this){
                    this.el.innerHTML = "";
                    $(this.el).append($el.children());
                }
                else {
                    this.el = $el[0];
                }
                this.$el = $(this.el);
                this.$ = this.$el.find.bind(this.$el);
                this.undelegateEvents();
                this.delegateEvents();
                this.$el.addClass([this.className,this.viewType,"block"].join(" "));
                this.el.muonView = this;
                this.el.dataset.muon = this.template?this.template+"_"+this.viewType:"";
                this.el.dataset.pack = this.package;
                renderFocus.call(this);
                this.__renderDependencySrc__();
                this.__renderDataRoutes__();
                this.__renderTranslation__();
                this.__renderDebugLabels__();
                this.__set__ && this.__set__();
                for(var i in m.baseViews){
                    var $els = this.$el.find("*[data-"+i+"-view]");
                    $els.each(function(){
                        insertView.call(_this,this,i,this.dataset.pack || _this.package,_this);
                    });
                }
                this.rendered && this.rendered($el);
            },
            __removeInnerViews__: function(){
                this.$("[data-muon]").each(function(){
                    if (this.muonView instanceof m.View) this.muonView.remove();
                });
            },
            remove: function(){
                delete this.el.muonView;
                this.__removeInnerViews__();
                if (this.__forcedElement__){
                    this.undelegateEvents();
                    this.$el.children().remove();
                }
                else this.$el.remove();
                this.stopListening();
                this.trigger("removed");
            },
            reload: function(){
                this.__removeInnerViews__();
                this.render();
                this.__reset__ && this.__reset__();
                this.trigger("reloaded");
            },
            pack: function(){return m.packages[this.package];},
            surrogate: function(){return m.packages[this.package].packageObject.surrogate;},
            focus: function(el){
                var el = this.$("[data-focus='"+el+"']");
                if (!el.length) return;
                el.focus();
            },
            trigger: function(){
                this.$el.trigger.apply(this.$el,arguments);
                _b_.View.prototype.trigger.apply(this.$el,arguments);
            }
        });
    })(m);

    m.CollectionView = m.View.extend({
        /**
         *  Атрибут определяет категорию
         *
         *  @attribute
         *  @name muon.viewType
         *  @private
         */
        viewType: "collection",
        /**
         * @constructor
         */
        initialize: function(collection){
            this.collection = collection;
            this.childModels = {};
            if (!this.modelView) this.modelView = this.template;
            if (_.isString(this.modelView)) this.modelView = m.getViewNameByType("model",this.modelView,collection.modelName,this.package);

            if (!this.modelView) throw Error("ModelView for collection view is not defined: "+this.template);
            this.listenTo(collection,"sync",this.__updateCollection__);
            this.listenTo(collection,"add",this.__addToCollection__);
            this.listenTo(collection,"remove",this.__removeFromCollection__);
            this.listenTo(collection,"sort",this.__sorted__);
            m.View.prototype.initialize.apply(this,arguments);
        },
        /**
         * Redefines basic muon.View 'remove' method
         *
         *
         */
        remove: function(){
            if (!this.collection.keep) delete __syncNames__[this.collection.__syncName__];
            delete this.collection;
            m.View.prototype.remove.call(this);
        },
        /**
         * Executes CollectionView specific context on view mapping
         *
         * @method
         * @name __set__
         * @private true
         */
        __set__:function(){
            this.target = this.target?this.$("#"+this.target):this.$el;
            this.__keepChildren__ = this.target.children();
            this.__keepChildrenLength__ = this.__keepChildren__.length;
            this.__updateCollection__(this.collection);
        },
        /**
         * Checks whether collection is empty or not and sets corresponding DOM class to view DOM element (this.el)
         *
         * @method
         * @name __setEmptyFlag__
         * @private
         */
        __setEmptyFlag__: function(){
            if (this.collection.length == 0) this.$el.addClass("empty-collection").removeClass("non-empty-collection");
            else this.$el.removeClass("empty-collection").addClass("non-empty-collection");
        },
        /**
         * Private method that adds new ModelView to CollectionView as a reaction on "add" collection event.
         *
         * @method
         * @private true
         * @name  __addToCollection__
         * @class CollectionView
         * @param {Object} obj as;ldkfj;alskjdf;la
         * @param {Object} second asdf asdf
         * @private
         * @return {muon.CollectionView|null} asdfasdfklasfd
         */
        __addToCollection__: function(obj){
            this.__setEmptyFlag__();
            var model = obj;
            if (this.target.children("#"+model.id).length == 0){
                var $modelView = new this.modelView(model);
                var after = this.target.children()[this.collection.models.indexOf(model)+this.__keepChildrenLength__];
                if (after)
                    $modelView.$el.before(after);
                else
                    this.target.append($modelView.$el);

                this.childModels[model.id] = $modelView;
            }
        },
        /**
         *
         * @param obj
         */
        __removeFromCollection__: function(obj){
            this.__setEmptyFlag__();
            if (obj.id in this.childModels)
                this.childModels[obj.id].remove();
        },
        /**
         *
         * @param {muon.Collection} collection
         */
        __updateCollection__: function(collection){
            this.__setEmptyFlag__();
            if (collection != this.context) return;
            var _ = this;
            if (!this.modelView){
                throw Error("No model view specified");
            }
            var inCollection = [];
            for(var i in collection.models){
                var model = collection.models[i];
                inCollection.push("#"+model.id);
            }
            var toRemove = this.target.children().not(inCollection.join(", "));
            this.__keepChildren__.each(function(){
                toRemove = toRemove.not(this);
            });
            toRemove.each(function(){
                _.childModels[$(this).attr("id")].remove();
                delete _.childModels[$(this).attr("id")];
            });
            var $modelView = null;
            for(var i in collection.models)
            {
                var model = collection.models[i];
                if (this.target.children("#"+model.id).length == 0){
                    var before = this.target.children()[i+this.__keepChildrenLength__];
                    $modelView = new this.modelView(model);
                    if (before) $modelView.$el.insertBefore(before);
                    else this.target.append($modelView.$el);
                    this.childModels[model.id] = $modelView;
                }
            }
        },
        /**
         * Triggers each time when collection __sorted__
         * @method
         * @param {muon.Collection} collection
         */
        __sorted__: function(collection){
            for(var i = 0; i < collection.length; i++){
                var model = collection.models[i];
                this.target.append(this.childModels[model.id].$el);
            }
        }

    });

    function setGetElementValue(view,getter){
        function set(val){
            if (!this.dataset["attrType"]){
                if (this.tagName == "INPUT" || this.tagName == "SELECT") $(this).val(val);
                else this.innerText = val;
            }
            else if (this.dataset["attrType"] == "text") this.innerText = val;
            else if (this.dataset["attrType"] == "html") this.innerHTML = val;
            else $(this).attr(this.dataset["attrType"],val);
        }
        if (typeof view["get_"+getter] == "function"){
            var val = view["get_"+getter]();
            if (typeof val == "object" && "then" in val) val.then(set.bind(this));
            else set.call(this,val);
        }
        else set.call(this,view.model.get(getter));
    }

    function updateModelView(attrs){
        var _this = this;
        if (this.$el.find("[data-model-attr]").length != 0){
            for(var i in attrs){
                var $subElement = this.$el.find("[data-model-attr^='"+i+"']");
                if (!$subElement.length) continue;
                $subElement.each(function(){
                    var attrsList = this.dataset["modelAttr"].split(".");
                    var attrValue = attrs[attrsList.shift()];
                    try {
                        while(attrsList.length != 0){
                            attrValue = attrValue[attrsList.shift()];
                        }
                    }
                    catch(e){
                        attrValue = attrValue.toString();
                    }
                    if (!this.dataset["attrType"]) this.innerText = attrValue;
                    else if (this.dataset["attrType"] == "text") this.innerText = attrValue;
                    else if (this.dataset["attrType"] == "html") this.innerHTML = attrValue;
                    else $(this).attr(this.dataset["attrType"],attrValue);
                });
            }
        }
        this.$el.find("[data-model-get],[data-model-set]").each(function(){
            setGetElementValue.call(this,_this,this.dataset.modelGet || this.dataset.modelSet);
        });
        this.__renderDataRoutes__();
    }

    m.ModelView = m.View.extend({
        viewType: "model",
        initialize: function(model){
            var _this = this;
            this.model = model;
            this.listenTo(model,"change",this.__update__);
            this.listenTo(model,"destroy",_this.remove);
            m.View.prototype.initialize.apply(this,arguments);
        },
        __set__: function(){
            updateModelView.call(this,this.model.attributes);
            var view = this;
            this.$el.find("[data-model-set]").each(function(){
                var setter = this.dataset.modelSet;
                var _this = this;
                var int = null;
                view.listenTo(view.model,"sync",function(){
                    setGetElementValue.call(_this,view,setter);
                });
                if (!(this.dataset.silent || view.silent)){
                    $(this).keyup(function(){
                        clearTimeout(int);
                        int = setTimeout(function(){$(_this).trigger("change");},150);
                    });
                    $(this).change(function(){
                        if (typeof view["set_"+setter] == "function") view["set_"+setter]($(this).val());
                        else view.model.set(setter,$(this).val());
                    });
                }
            });
            this.$el.attr("id",this.model.id);
        },
        __update__:function(a,b,c){
            updateModelView.call(this,this.model.changedAttributes());
        },
        remove: function(){
            if (!this.model.collection){
                delete __syncNames__[this.__syncName__];
            }
            m.View.prototype.remove.call(this);
        },
        destroy: function(){
            return this.model.destroy();
        },
        save: function(){
            var view = this;
            this.$el.find("[data-model-set]").each(function(){
                var setter = this.dataset.modelSet;
                if (typeof view["set_"+setter] == "function") view["set_"+setter]($(this).val());
                else view.model.set(setter,$(this).val(),{silent: true});
            });
            return view.model.save();
        },
        fetch: function(){
            return this.model.fetch();
        }
    });

    m.WidgetView = m.View.extend({viewType: "widget"});

    m.LayoutView = m.View.extend({
        viewType: "layout",
        initialize:function(blocks){
            this.blocks = blocks || {};
            m.View.prototype.initialize.apply(this,arguments);
        },
        __set__:function(){
            for(var i in this.blocks){
                var block = this.blocks[i];
                this.$el.find("#"+i).html("");
                this.$el.find("#"+i).append(block.$el);
            }
        },
        __reset__: function(){
            for(var i in this.blocks){
                var block = this.blocks[i];
                block.reload();
                this.$("#"+i).html("");
                this.$("#"+i).append(block.$el);
            }
        },
        get: function(alias){
            if (alias in this.blocks)
                return this.blocks[alias];
            else
                throw new Error("View is not in layout.");
        },
        removeView: function(id){
            if (id in this.blocks){
                this.$("#"+id).html("");
                this.blocks[id].remove();
                delete this.blocks[id];
            }
        },
        update:function(blocks){
            var prevBlock = this.blocks || {};
            for(var i in blocks){
                var block = blocks[i];
                if (i in prevBlock) {
                    prevBlock[i].remove();
                }
                this.blocks[i] = blocks[i];
                this.$("#"+i).html("");
                this.$("#"+i).append(block.$el);
            }
            return this;
        },
        remove: function(){
            for(var i in this.blocks){
                if (this.blocks[i]) this.blocks[i].remove();
            }
            m.View.prototype.remove.call(this);
        }
    });
    /**
     * Класс представления
     *
     * Представления помещаемые в стек объекта
     * @type {*}
     */
    m.StackView = m.View.extend({
        viewType: "stack",
        initialize: function(){
            this.views = {};
            m.View.prototype.initialize.apply(this,arguments);
        },
        __set__:function(){
            if (this.target) this.$target = this.$("#"+this.target);
            else this.$target = this.$el;
            this.$target.addClass('');
        },
        __reset__: function(){
            for(var i in this.views){
                var view = this.views[i];
                if (view instanceof m.View){
                    view.reload();
                    this.$target.append(view.$el);
                }
                if (this.current == i) view.trigger("viewShown");
            }
        },
        add: function(alias,view){
            if (alias instanceof m.View){
                view = alias;
                alias = view.template;
            }
            if (!(view instanceof m.View)) throw Error(View.toString()+" is not proper View object");
            this.views[alias] = view;
            this.listenTo(view,"removed",function(){
                delete this.views[alias];
            });
            view.$el.hide();
            this.$target.append(view.$el);
        },
        removeView: function(id){
            if (id in this.views){
                this.$("#"+id).html("");
                this.views[id].remove();
                delete this.views[id];
            }
        },
        remove: function(){
            for(var i in this.views){
                if (this.views[i] instanceof m.View) this.views[i].remove();
            }
            m.View.prototype.remove.call(this);
        },
        get: function(name){
            if (name in this.views)
                return this.views[name];
            else
            if(this instanceof m.ApplicationStackView) throw Error("Page is not application view: "+name);
            else throw new Error("View is not in this stacked view: "+name);
        },
        show: function(name){
            var _this = this;
            if (this.current == name) return;
            if (!(name in this.views)){
                if(this instanceof m.ApplicationStackView) throw Error("Page is not in application view: "+name);
                else throw Error("View is not in this stacked view: "+name);
            }

            this.previous = _this.current;
            this.current = name;
            function _hide(){
                var i = _this.previous;
                if ('function' == typeof _this.hideAction) _this.hideAction(_this.views[_this.previous],_this.views[name],_show);
                else{
                    _this.views[i].$el.hide();
                    _show();
                }
            }

            function _show(){
                var i = name;
                if ('function' == typeof _this.showAction) _this.showAction(_this.views[_this.previous],_this.views[name],_proceed);
                else {
                    _this.views[i].$el.show();
                    _proceed();
                }
            }
            function _proceed(){
                _this.views[name].viewShown && _this.views[name].viewShown()
                _this.views[name].trigger("viewShown");
                if ('function' == typeof _this.postShow) _this.postShow();
            }
            this.beforeShow && this.beforeShow();
            if (_this.previous != undefined && _this.previous != null){
                _this.views[name].viewHidden && _this.views[name].viewHidden()
                _this.views[_this.previous].trigger("viewHidden");
                _hide();
            }
            else _show();
        }
    });
    /**
     * Класс преставления приложения
     *
     * @name ApplicationStackView
     * @namespace muon
     */

    m.ApplicationStackView = m.StackView.extend({
        template: "application",
        __set__:function(){
            /**
             * Если ранее __applicationView__ не был задан значит это самый первый созданный ApplicationStackView объект
             */
            if (!(m.__applicationView__ instanceof m.ApplicationStackView))
                m.__applicationView__ = this;
            m.StackView.prototype.__set__.apply(this);
        },
        get: function(name){
            name += /_page$/.test(name)?"":"_page";
            if (this.views[name] == name){
                var view = new (this.pack().views.layout[name]);
                this.views[name] = view;
                this.$target.append(view.$el);
            }
            return m.StackView.prototype.get.call(this,name);
        },
        show: function(name){
            name += /_page$/.test(name)?"":"_page";
            if (this.views[name] == name){
                var view = new (this.pack().views.layout[name]);
                this.views[name] = view;
                this.$target.append(view.$el);
            }
            m.StackView.prototype.show.call(this,name);
        },
        add: function(alias,view){
            if (!view && typeof alias == "string"){
                alias += /_page$/.test(alias)?"":"_page";
                if (alias in this.pack().views.layout) this.views[alias] = alias;
                else throw Error("Can't add not PageLayoutView instance to ApplicationStackView: "+view.template+"_"+view.viewType);
                return;
            }
            if (!view) view = alias;
            if (!(view instanceof m.PageLayoutView))
                throw Error("Can't add not PageLayoutView instance to ApplicationStackView: "+view.template+"_"+view.viewType);
            if (!view) alias = view.template;
            this.views[alias] = view;
            view.$el.hide();
            this.$target.append(view.$el);
        },
        addPages: function(pages){
            var alreadyIn = [];
            var layouts = this.pack().views.layout;
            for(var i in pages){
                var perPageIn = [];
                var q = pages[i];
                q = q.replace(/\-/g,"\\-");
                q = q.replace(/\*/g,"[a-zA-Z0-9\\-_]*").replace(/\?/g,"[a-zA-Z0-9\\-_]").replace(/\+/g,"[a-zA-Z0-9\\-_]+");
                q = q.replace(/\*/,"*?").replace(/\+/,"+?");
                q = new RegExp("^"+q+"_page$");
                for(var j in layouts){
                    if (alreadyIn.indexOf(j) != -1) continue;
                    if (j.match(q)){
                        perPageIn.push(j);
                        alreadyIn.push(j);
                        this.add(j);
                    }
                }
            }

        }
    });

    /**
     * Класс muon.PageLayoutView формирует базовый
     *
     * @class
     * @type {*}
     */
    m.PageLayoutView = m.LayoutView.extend({
        /**
         * Переопределение метода __set__ класса View {@link muon.View#__set__}
         *
         * Создание объекта muon.PageLayoutView приводит к автоматическому добавлению представления в
         * представление приложения
         *
         * @name __set__
         * @private
         */
        __set__: function(){
            if (this.context instanceof m.ApplicationStackView){
                this.$el.append(this.context.$el);
            }
            m.LayoutView.prototype.__set__.call(this);
        }
    });
    $.ajaxSetup({
        beforeSend: function(xhr){
            xhr.setRequestHeader("Muon-Request","data-request");
        }
    });

    var History = _b_.History;
    _b_.History.prototype.navigate = function(fragment, options) {
        if (!History.started) return false;
        if (!options || options === true) options = {trigger: options};
        fragment = this.getFragment(fragment || '');
//        if (this.fragment === fragment) return;
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

    m.Router = _b_.Router.extend({
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
            _b_.Router.prototype.route.apply(this,arguments);
        },
        routes: {},
        path: function(){
            return m.__staticApp__?"/"+location.hash.replace(/^#/,""):location.pathname;
        },
        reload: function(){
            return this.navigate(this.path(),{replace: true,trigger:true});
        },
        navigate: function(url,opts){
            var _this = m.router;
            _.defer(function(){
                opts = opts || {};
                if (!("trigger" in opts)) opts.trigger = true;
                if (!(opts && opts.skipHistory)){
                    __history__.push(_this.path());
                    __forwardHistory__ = [];
                }
                if (url.match(/^\//)){
                    if(url.match(/^\/\//)) location = url;
                    else _b_.Router.prototype.navigate.apply(this,[url,opts]);
                }
                else {
                    _b_.Router.prototype.navigate.apply(this,
                        [_this.path() +(_this.path().match(/\/$/)?"":"/")+ url,opts]);
                }
            });
        },
        back: function(){
            if (__history__.length == 0){
                _.defer(this.navigate,"/",{replace:true,trigger:true,skipHistory: true});
                return false;
            }
            else {
                __forwardHistory__.unshift(this.path());
                _.defer(this.navigate,__history__.pop(),{replace:true,trigger:true,skipHistory: true});
            }
            return true;
        },
        forward: function(){
            if (__forwardHistory__.length == 0) return false;
            __history__.push(this.path());
            _.defer(this.navigate,__forwardHistory__.shift(),{replace:true,trigger:true,skipHistory: true});
            return true;
        }

    });

    function bindSurrogate(method,surrogate){
        if (typeof method == "string") method = surrogate[method];
        if (!method) return;
        return _.bind(method,surrogate);
    };

    var toRegExp = function(route){
        return _.isRegExp(route)?route:_b_.Router.prototype._routeToRegExp(route);
    };

    function addPackRoutes(pack,route,mod){
        var flattenMiddleware = function(mid){return flattenMiddlewareiddleware(mid,mod.surrogate);};
        mod.middleware = flattenMiddleware(mod.middleware);
        if (m.packages[pack].parentPack && m.packages[pack].parentPack.middleware )
            mod.middleware = flattenMiddleware(mod.middleware.concat(m.packages[pack].parentPack.middleware));
        m.packages[pack].middleware = mod.middleware;
        if (_.isObject(mod.routes) && !mod.routes.length){
            var routeKeys = _.keys(mod.routes);
            for(var i in routeKeys.reverse())
                addRoute(pack,route,routeKeys[i],bindSurrogate(mod.routes[routeKeys[i]],mod.surrogate),mod.middleware);
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
                            addRoute(pack,route,rObject.route, bindSurrogate(rObject.callback,mod.surrogate),
                                routerMiddleware,rObject.page);
                        if (_.isObject(rObject.routes)){
                            var routeKeys = _.keys(rObject.routes);
                            for(var j in routeKeys.reverse()){
                                var callback = bindSurrogate(rObject.routes[routeKeys[j]],mod.surrogate);
                                addRoute(pack,route,routeKeys[j],callback,routerMiddleware,rObject.page);
                            }
                        }
                    }
                }
            }
        }
    }

    function runRouterMiddleware(middleware,callback){
        var surrogate = this;
        if (middleware.length == 0) return callback();
        try {
            $.when(middleware.shift().call(surrogate))
                .then(_.partial(runRouterMiddleware.bind(surrogate),middleware,callback),m.router.back);
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
        var surrogate = m.packages[pack].packageObject.surrogate;
        m.router.route(prepareRoute(pref,route),pack+"_"+route, function(){
            var _args = arguments;
            var pageToShow = page;
            var appView = m.packages[pack].appView;
            surrogate.currentPage = undefined;
            try{surrogate.currentPage = appView.get(pageToShow+(/_page$/.test(pageToShow)?"":"_page"));}
            catch(e){}
            runRouterMiddleware.call(surrogate,middleware.slice(),function(){
                handler && handler.apply(surrogate,_args);
                do {
                    try{ appView.show(pageToShow); }
                    catch(e){console.log(e.stack);break;}
                    pageToShow = appView.__parentAppPage__;
                } while(appView = appView.__parentAppView__);
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

    function flattenMiddlewareiddleware(middl,surrogate){
        return _.flatten([middl]).filter(function(m){return typeof m == "function";}).map(function(f){return _.bind(f,surrogate);});
    }

    function procUnhandledViews(pack){
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

    function procProfiledViews(pack){
        $("script[data-pack='"+pack+"'][type='text/muon-template'][data-profile]").each(function(){
            var name = this.id.replace(/_template$/,"");
            var type = name.match(/_([a-zA-Z0-9]*?)$/)[1];
            name = name.replace(RegExp("_"+type+"$"),"");
            m.packages[pack].views[type][name].profiles = m.packages[pack].views[type][name].profiles || [];
            m.packages[pack].views[type][name].profiles.push(this.dataset.profile);
            if (!(__profiles__[this.dataset.profile] instanceof Array)) __profiles__[this.dataset.profile] = [];
            __profiles__[this.dataset.profile].push("[data-muon='"+name+"_"+type+"'][data-pack='"+pack+"']");
        });
    }

    m.requirePack = function(pack,callback,parentPack){
        if (pack in m.packages) return function(){};
        var fallbackPath = "";
        var pluginName = pack.substr(0,pack.lastIndexOf(":"));
        var route = null, fullRoute = null;

        function procLoadedPackage(){
            var mod = m.packages[pack].packageObject;
            m.packages[pack].parentPack = m.packages[parentPack||""];
            mod.surrogate = mod.surrogate || {};
            mod.surrogate.m = __plugins__[pluginName];
            procUnhandledViews(pack);
            procProfiledViews(pack);
            if (route){
                _b_.history.handlers = _b_.history.handlers.filter(function(obj){
                    if (obj.route.toString() == toRegExp(route).toString() ||
                        obj.route.toString() == toRegExp(fullRoute).toString()) return false;
                    return true;
                });
                __routes__ = __routes__.filter(function(obj){
                    return (obj.callback == fallback)?false:true;
                });
                addPackRoutes(pack,route,mod);
            }
            function formPackApplicationLayout(){
                mod.useAppView = mod.useAppView || true;
                if (mod.useAppView){
                    var appViewClass = null;
                    if (m.packages[pack].views.stack && m.packages[pack].views.stack.application)
                        appViewClass = m.packages[pack].views.stack.application;
                    else
                        appViewClass = m.ApplicationStackView.extend({package:pack});
                    var appView = m.packages[pack].appView = new appViewClass;
                    if (m.__applicationView__ == appView) appView.$el.appendTo("body");
                    else {
                        if (m.packages[parentPack]
                            && m.packages[parentPack].appView instanceof m.ApplicationStackView)
                        {
                            var page = new m.PageLayoutView();
                            var pageName = appView.__parentAppPage__ = "m_"+getUniq()+"_page";
                            appView.__parentAppView__ = m.packages[parentPack].appView;
                            page.el.appendChild(appView.el);
                            appView.__parentAppView__.add(pageName,page);
                        }
                    }
                    appView.addPages(mod.pages || ["*"]);
                }
                _.defer(function(){
                    _b_.history.loadUrl();
                });
            }

            if (typeof mod.ready == "function") _.defer(mod.ready.bind(mod.surrogate),formPackApplicationLayout);
            else formPackApplicationLayout();
        };

        function packLoaded(){
            m.__prevPackage__ = m.__currentPackage__;
            m.__prevPlugin__ = m.__currentPlugin__;
            m.__currentPackage__ = pack;
            m.__currentPlugin__ = pluginName;
            var packObject = new MuonPackage(pack);
            m.packages[pack] = packObject;
            packObject.routerPath = route;
            packObject.loaded = true;
            var pluginObject = __registerPlugin(m.__currentPlugin__);
            packObject.m = pluginObject;
            pluginObject = __plugins__[""];
            var pluginStack = pluginName.split(":");
            for(var i in pluginStack){
                var shorterName = pack.substr(pack.indexOf(":")+1);
                if (pluginStack[i] != "") pluginObject = pluginObject.plugins[pluginStack[i]];
                pluginObject.packages[shorterName] = packObject;
            }

            for(var i in m.__packageInitData__[pack].dependencies.css){
                var css = m.__packageInitData__[pack].dependencies.css[i];
                $("<style />").text(css).appendTo("head");
            }
            for(var i in m.__packageInitData__[pack].dependencies.js){
                eval(m.__packageInitData__[pack].dependencies.js[i]);
            }

            for(var i in m.__packageInitData__[pack].models){
                if (i in m.models) continue;
                else eval(m.__packageInitData__[pack].models[i]);
            }

            var views = m.__packageInitData__[pack].views;
            function proc_view(){
                if (views.length == 0) return finalize();
                var view_data = views.shift();
                var script_match = "";
                if ((script_match = view_data.match(/^<script type='text\/javascript'[\s\S]*?>/)) && (m.__serverMode__ != "production"))
                {
                    var id = $(script_match[0]).attr("id");
                    var scrpt = document.createElement("script");
                    scrpt.src = "/pack_view/"+pack+"/"+id+"?muon";
                    scrpt.type = "text/javascript";
                    document.head.appendChild(scrpt);
                    scrpt.onload = proc_view;
                }
                else {
                    $(view_data).appendTo(document.head);
                    proc_view();
                }
            }

            function finalize() {
                m.packages[pack].packageObject = m.__packageInitData__[pack].package;
                m.packages[pack].translation = m.__packageInitData__[pack].translation;
                procLoadedPackage();
                m.__currentPackage__ = m.__prevPackage__;
                m.__currentPlugin__ = m.__prevPlugin__;
                delete m.__prevPackage__;
                delete m.__prevPlugin__;
            }
            proc_view();
        }

        var fallback = function(){
            fallbackPath = m.router.path();
            if (m.packages[pack] && m.packages[pack].loaded){return;}
            if (m.__packageInitData__[pack]) packLoaded();
            else {
                var callbackName = "mpackcallback"+Date.now();
                m[callbackName] = function(){
                    packLoaded();
                    delete m[callbackName];
                };
                var scrpt = $("<script />");
                scrpt.attr("src","/pack/"+pack+"?muon&lang="+ m.getLanguage()+"&m_callback="+callbackName);
                scrpt.appendTo(document.head);
            }
        };

        _.defer(function(){
            var routes = _.where(__routes__,{callback:fallback});
            if (routes.length != 0){
                route = routes[0].route;
                fullRoute = prepareRoute([route,"/*a"]);
                m.router.route(fullRoute,getUniq(),fallback);
            }
            else _.defer(fallback);
            callback && callback();
        });

        return fallback;
    };

    m.router = new m.Router();
    $(function(){
        if (m.__staticApp__ && !/^file/.test(location.protocol) && location.pathname.replace(/^\//,"")){
            location.pathname = "/";
            return;
        }
        m.router.route("/","#{default_pack}",m.requirePack("application",function(){
            _b_.history.start(m.__staticApp__?{}:{pushState:true});
        }));
        $("body").addClass("muon").delegate("a[data-route]","click",function(ev){
            ev.preventDefault();
            this.href = this.href || this.dataset.route;
            var path = this.href.replace(/(^\s+)|(\s+$)/,"");
            path = path.replace(this.host,"").replace(this.protocol+"//","");
            m.router.navigate(path,{trigger: true});
        });
    });

    window.muon = window.m = m;
})(Backbone);
