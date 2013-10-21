/**
 * Here you can put all common part of your CSS code.
 *
 * @file
 * @name assets/js/muon.js
 *
 */

(function(_b_){
    function serialize_object(obj) {
        var str = [];
        for(var p in obj)
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        return str.join("&");
    }

//    var $ = function(){
    // DOM Function
//    }

    var __Muon_base__ = {
        __projections__: {},
        packages: {},
        models: {},
        plugins: {},
        collections: {},
        dependencies: [],
        base_views: {}
    };

    var __Muon_pack_base__ = {
        views: {},
        views_unnamed: {},
        router_path: null,
        loaded: false,
        translation: {}
    };

    var __sync_names__ = {};

    var __default_lang__ = document.getElementsByTagName("html")[0].lang || "en";
    var __debug__ = false, __profiles__ = {}, __routes__ = [],
        __plugins__ = {}, __history__ = [], __forward_history__ = [];

    var __views_arr__ = [];
    var __models_arr__ = [];

    function __m_deep_extend__(dst,src){
        for(var i in src){
            if (src[i] instanceof Function) { dst[i] = src[i]; continue; }
            if (src[i] instanceof Array) { dst[i] = src[i].slice(); continue; }
            if (src[i] instanceof Object) { dst[i] = Object.create(src[i]); __m_deep_extend__(dst[i],src[i]); continue;}
            dst[i] = src[i];
        }
    }

    function MuonPlugin (name){ __m_deep_extend__(this,__Muon_base__); this.name = name; };
    function MuonPackage (name){ __m_deep_extend__(this,__Muon_pack_base__); this.name = name; };

    _.extend(MuonPlugin.prototype,{
        get_projection: function(key){
            return this.__projections__[key];
        },
        set_projection: function(key,val){
            this.__projections__[key] = val;
            $(this).trigger("projection_updated."+key);
        },
        remove_projection: function(key){
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
        __package_init_data: {},
        __base_package__: "application",
        __static_app__: false,
        is_debug: function(){
            return __debug__;
        },
        set_debug: function(arg){
            __debug__ = !!arg;
            if (!__debug__) $("body").removeClass("debug");
            else{
                /debug/.test(document.body.className) && (document.body.className += " debug");
                $("*[data-muon]").each(function(){
                    if (this.muon_view instanceof m.View) this.muon_view.render_debug_labels();
                });
            }
        },
        set_language: function(lang){
            document.getElementsByTagName("html")[0].lang = lang || __default_lang__;
            var packs = [];
            for(var i in m.packages){
                packs.push(i);
            }
            $.getJSON("/pack_translation/"+lang,{packs:packs.join(",")}).then(function(obj){
                console.log(obj);
                for(var i in obj){
                    if (!(i in m.packages)) continue;
                    m.packages[i].translation = obj[i];
                }
                $("*[data-muon]").each(function(){
                    if (this.muon_view instanceof m.View) {
                        console.log(this.muon_view);
                        this.muon_view.render_translation();
                    }
                });
            });
        },
        get_language: function(){ return document.getElementsByTagName("html")[0].lang || __default_lang__; },
        set_profile: function(profile,flag){
            if (profile == "muon") return;
            _.defer(function(){
                if (flag === false){ return m.remove_profile(profile); }
                if (m.has_profile(profile)) return;
                var className = document.body.className.split(/\s+/);
                className = className.concat(profile.split("."));
                document.body.className = className.sort().join(" ");
                var profiles_to_filter = _.keys(__profiles__).filter(function(p){
                    return RegExp(profile.split(".").sort().join(".([a-zA-Z0-9_]+.)*?")).test(p);
                });
                profiles_to_filter = profiles_to_filter.filter(function(p){return m.has_profile(p);});
                if (profiles_to_filter.length == 0) return;
                var templates = [];
                for(var i in profiles_to_filter){
                    templates = templates.concat(__profiles__[profiles_to_filter[i]]);
                }
                $("[data-muon]").filter(templates.join(",")).each(function(){
                    if (this.muon_view instanceof m.View) this.muon_view.reload();
                });
            });
        },
        remove_profile: function(profile){
            if (profile == "muon") return;
            _.defer(function(){
                if (!m.has_profile(profile)) return;
                var profiles_to_filter = _.keys(__profiles__).filter(function(p){
                    return RegExp(profile.split(".").sort().join(".([a-zA-Z0-9_]+.)*?")).test(p);
                });
                profiles_to_filter = profiles_to_filter.filter(function(p){return m.has_profile(p);});
                if (profiles_to_filter.length == 0) return;
                var templates = [];
                for(var i in profiles_to_filter){
                    templates = templates.concat(__profiles__[profiles_to_filter[i]]);
                }
                $("body").removeClass(profile);
                $("[data-muon]").filter(templates.join(",")).each(function(){
                    if (this.muon_view instanceof m.View) this.muon_view.reload();
                });
            });
        },
        has_profile: function(profile){
            return RegExp(profile.split(".").sort().join(".([a-zA-Z0-9_]+.)*?")).
                test(document.body.className.split(/\s+/).sort().join("."));
        },
        get_profile: function(){
            return document.body.className.split(/\s+/).sort().join(".");
        }
    });

    m.MuonPlugin = MuonPlugin;
    m.__current_package__ = "";
    m.__current_plugin__ = "";
    m.packages[""] = new MuonPackage("");
    __plugins__[""] = m;
    __plugins__[undefined] = m;

    function __registerPlugin(plugin){
        if (plugin in __plugins__) return __plugins__[plugin];
        var pl_stack = plugin.split(":");
        var pl_obj = m;
        var temp_pl_name = "";
        for(var i in pl_stack){
            var pl_name = pl_stack[i];
            if (pl_name in pl_obj.plugins) { pl_obj = pl_obj.plugins[pl_name]; continue; }
            temp_pl_name += temp_pl_name?temp_pl_name+":":"" + pl_name;
            pl_obj.plugins[pl_name] = new MuonPlugin(temp_pl_name);
            pl_obj = pl_obj.plugins[pl_name];
        }
        __plugins__[plugin] = pl_obj;
        return pl_obj;
    }

    var _view_b = _b_.View.extend;
    var _model_b = _b_.Model.extend;
    var _coll_b = _b_.Collection.extend;

    _b_.View.extend = function(obj,common){
        var view_type = (_.isString(obj.view_type))?obj.view_type:this.prototype.view_type;
        obj.package = obj.package || m.__current_package__ || this.prototype.package || m.__base_package__;
        obj.plugin = obj.plugin || m.__current_plugin__  || this.prototype.plugin || "";
        obj.m = __registerPlugin(obj.plugin);
        var new_view = _view_b.apply(this,arguments);
        if (obj.__auto_generated__) return new_view;
        var template = new_view.prototype.template;
        if (typeof template == "string"){
            if (!_.isObject(m.packages[m.__current_package__].views[view_type]))
                m.packages[m.__current_package__].views[view_type] = {};
            m.packages[m.__current_package__].views[view_type][template] = new_view;
        }
        else {
            if (!_.isArray(m.packages[m.__current_package__].views_unnamed[view_type]))
                m.packages[m.__current_package__].views_unnamed[view_type] = [];
            m.packages[m.__current_package__].views_unnamed[view_type].push(new_view);
        }
        new_view.prototype.super = this.prototype.constructor.prototype;
        new_view.profiles = [];
        if (view_type && !m.base_views[view_type]) m.base_views[view_type] = new_view;
        return new_view;
    };

    _b_.Model.extend = function model_extend(obj,common){
        var model_name = "";
        if (typeof obj.model_name == 'string'){
            model_name = ((this.prototype.model_name?this.prototype.model_name+".":"")+obj.model_name).replace(/\.+/,".");
        }
        else model_name = this.prototype.model_name;
        if (obj.urlRoot && obj.urlRoot.indexOf("0.0.0.0") != -1){
            obj.urlRoot = obj.urlRoot.replace(/0\.0\.0\.0(:\d+)?/, m.__domain__?m.__domain__:location.host);
            if (m.__protocol__) obj.urlRoot = obj.urlRoot.replace(/^http:\/\//, m.__protocol__+"://");
        }
        var new_model = _model_b.apply(this,arguments);
        new_model.model_name = model_name;
        if (obj.__auto_generated__) return new_model;
        if (_.isString(model_name)) {
            var attrId = new_model.prototype.idAttribute;
            var _objs = {};
            function child(attrs,opts){
                attrs = attrs || {};
                if (typeof attrs === "string" || typeof attrs === "number"){
                    var _id = attrs;
                    if (!(_id in _objs)){
                        attrs = {}; attrs[attrId] = _id;
                        var obj = new new_model(attrs,opts);
                        _objs[_id] = obj;
                    }
                    else {
                        var obj = _objs[_id];
                    }
                    if (opts && opts.force_sync) obj.fetch();
                    return _objs[_id];
                }
                if (typeof attrs._id === "string" || typeof attrs._id === "number"){
                    if (attrs._id in _objs) _objs[attrs._id].set(attrs);
                    else _objs[attrs._id] = new new_model(attrs,opts);
                    return _objs[attrs._id];
                }
                return new new_model(attrs,opts);
            };
            child.prototype = new_model.prototype;
            child.prototype.constructor = child;
            _.extend(child,new_model);

            child.__objects__ = _objs;
            child.model_name = model_name;

            m.models[model_name] = child;
            var plugin_name = model_name.substr(0,model_name.lastIndexOf(":"));
            var plugin_obj =  __registerPlugin(plugin_name);
            child.prototype.m = plugin_obj;
            plugin_obj = __plugins__[""];
            var plugin_stack = plugin_name.split(":");
            for(var i in plugin_stack){
                var shorter_name = model_name.substr(model_name.indexOf(":")+1);
                if (plugin_stack[i] != "") plugin_obj = plugin_obj.plugins[plugin_stack[i]];
                plugin_obj.models[shorter_name] = child;
                plugin_obj["model_"+shorter_name.replace(/[:\.]/g,"_")] = child;
            }
            return child;
        }
        return new_model;

    };

    _b_.Collection.extend = function(obj,common){
        var collection_url = (_.isString(obj.url))?obj.url:this.prototype.url;
        var new_coll = _coll_b.apply(this,arguments);
        if (obj.__auto_generated__) return new_coll;
        if (_.isString(collection_url)) m.collections[collection_url] = new_coll;
        new_coll.prototype.super = this.prototype.constructor.prototype;
        return new_coll;
    };

    function getUniq(){
        return Math.floor(Math.random()*9*Math.pow(10,9)+Math.pow(10,9));
    }

//    _b_.ajax = function(request){
//        request.url += (request.url.indexOf("?") == -1?"?":"&");
//        return $.ajax.apply(_b_,arguments);
//    };

    m.Model = _b_.Model.extend({
            idAttribute: "_id",
            initialize: function(data,options){
                var _this = this;
                options = options || {};
                for(var i in options) this[i] = options[i];
                this.sync_name = "mod_"+Math.floor(Math.random()*10000);
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
                        if (args) if ('error' === typeof args.error) args.error.apply(_this,arguments);
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
                        if (args) if ('error' === typeof args.error) args.error.apply(_this,arguments);
                        dfd.reject(arguments);
                    }
                });
                return dfd.promise();
            },
            action: function(action,args_obj,opts){
                var _this = this;
                args_obj = args_obj || {};
                args_obj.__action__ = action;
                opts = opts || {};
                var s = opts.success,
                    e = opts.error;
                opts.success = function(){s && s.apply(_this,arguments);};
                opts.error = function(){e && e.apply(_this,arguments);};
                opts.data = args_obj;
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
            collection: function(obj_search_params){
                obj_search_params = serialize_object(obj_search_params || {});
                if (obj_search_params) obj_search_params = "?__action__=search&"+obj_search_params;
                return new m.Collection([],{
                    url: this.prototype.urlRoot+obj_search_params,
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
            this.model_name = this.model.model_name || this.model.prototype.model_name;
            this.set_comparator(this.comparator);
            var _ = this;
            this.sync_name = "col_"+Math.floor(Math.random()*10000);
            __sync_names__[this.sync_name] = this;
            setTimeout(function(){
                for(var i in __sync_names__){
                    if ((__sync_names__[i] == _) && (i != _.sync_name)){
                        _.keep = true;
                        delete __sync_names__[_.sync_name];
                        _.sync_name = i;
                    }
                }
            },0);
            if (typeof this.init == "function") this.init(arguments);

        },
        set_comparator: function(c){
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
                    if (args) if ('error' === typeof args.success) args.error.apply(_this,arguments);
                    dfd.reject(arguments);
                }
            });
            return dfd.promise();
        }
    });

    (function(m){
        function profile_sort(a,b){
            if (a.split(".").length > b.split(".").length) return -1;
            if (a.split(".").length < b.split(".").length) return 1;
            return 0;
        }

        m.template_for_view = function(view) {
            var selector = view.template+"_"+view.view_type;
            var profile = "muon";
            view.constructor.profiles = view.constructor.profiles.sort(profile_sort);
            for(var i in view.constructor.profiles){
                if (m.has_profile(view.constructor.profiles[i]))
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

        function attrs_parser(attrs){
            var ret = {};
            var temp_cattrs = attrs || "";
            temp_cattrs = temp_cattrs.split(";");
            for(var i in temp_cattrs){
                var attr = temp_cattrs[i].split(":");
                if (attr.length != 2) continue;
                ret[attr[0].replace(/^\s+/,"").replace(/\s+$/,"")] = attr[1].replace(/^\s+/,"").replace(/\s+$/,"");
            }
            return ret;
        }
        var proc_projection = {
            collection: function(el,collection_name,projection){
                var coll_attrs = attrs_parser(el.dataset["contextAttrs"]);
                if (typeof coll_attrs.model === "string"){
                    if (!(coll_attrs.model in m.models)) throw Error("Unknown model: "+coll_attrs.model);
                    coll_attrs.model = m.models[coll_attrs.model];
                }
                if (projection instanceof m.Collection) return _.extend(projection,coll_attrs);
                var Collection = m.collections[collection_name] || m.Collection;
                var dfd = $.Deferred();
                if (_.isArray(projection)){
                    var coll = new Collection([],coll_attrs);
                    for(var i in projection){
                        var el = projection[i];
                        if (typeof el == "string" || typeof el == "number" || _.isObject(el)){
                            coll.add(new Collection.prototype.model(el));
                        }
                    }
                    return coll;
                }
                if (projection === undefined){
                    var coll = new Collection([],coll_attrs);
                    coll.fetch();
                    return coll;
                }
                _.defer(dfd.reject,"Wrong projection type");
                return dfd.promise();
            },
            model: function(el,model_name,projection){
                var model_attrs = attrs_parser(el.dataset["contextAttrs"]);
                model_attrs.__auto_generated__ = true;
                if (projection instanceof m.Model) return _.extend(projection,model_attrs);
                if (!(model_name in m.models) && !(model_name in this.m.models)) throw Error("Unknown model name: "+model_name);
                var Model = m.models[model_name] || this.m.models[model_name];
                if (el.dataset.contextAttrs) Model = Model.extend(model_attrs);
                var dfd = $.Deferred();
                if ((typeof projection == "string" || typeof projection == "number" || projection) && el.dataset.modelId)
                    throw Error("You shouldn't use both projection variable and model Id attribute in one view simultaneously.");
                if (typeof projection == "string" || typeof projection == "number" ){
                    _.defer(dfd.resolve,new Model(projection,{force_sync: true}));
                    return dfd.promise();
                }
                if (typeof el.dataset.modelId == 'string'){
                    _.defer(dfd.resolve,new Model(el.dataset.modelId,{force_sync: true}));
                    return dfd.promise();
                }
                if (_.isObject(projection) || projection === undefined){
                    return new Model();
                }
                _.defer(dfd.reject,"Wrong projection type");
                return dfd.promise();
            },
            layout: function(el,non,projection){
                return _.extend(projection,attrs_parser(el.dataset["contextAttrs"]));
            },
            stack: function(el,non,projection){
                return _.extend(projection,attrs_parser(el.dataset["contextAttrs"]));
            },
            widget: function(el,non,projection){
                return _.extend(projection,attrs_parser(el.dataset["contextAttrs"]));
            }
        };

        m.get_view_by_name = function(view_type,view_name,_context_name,pack,recursive){
            pack = pack || m.__base_package__;
            _context_name = _context_name || "";
            pack = pack || m.__base_package__;
            try{
                var View = null;
                if (!View && !recursive) View = m.packages[pack].views[view_type][view_name];
                if (!View && (view_type == "model" || view_type == "collection") && _context_name){
                    var context_name = _context_name.replace(/:/g,".").split("."), _view_name = view_name;
                    for(var i in context_name) _view_name = _view_name.replace(RegExp("_"+context_name[i]+"$"),"");
                    if (_view_name != view_name) return m.get_view_by_name(view_type,_view_name,_context_name,pack,true);
                }
                if (!View && (view_type == "model" || view_type == "collection") && _context_name){
                    var context_name = _context_name.replace(/:/g,".").split(".").reverse().join("_");
                    while(!m.packages[pack].views[view_type][view_name+"_"+context_name] && context_name.length != 0){
                        var prev_name = context_name;
                        context_name = context_name.replace(/^[a-zA-Z0-9]+_/,"");
                        if (prev_name == context_name) context_name = "";
                    }
                    View = m.packages[pack].views[view_type][view_name+(context_name?"_":"")+context_name];
                }
                if (!View && recursive) View = m.packages[pack].views[view_type][view_name];
                if (!View) throw Error();
                return View;
            }
            catch(e){
                if (_context_name.indexOf(":") == -1) throw Error("Wrong view name:"+view_name+"_"+view_type+":"+_context_name+":"+ e.message);
                else return m.get_view_by_name(view_type,view_name,_context_name.substr(_context_name.indexOf(":")+1),pack,true);

            }
        };

        function check_presence_in_dom(el){
            while (el.parentElement) {
                if (el.parentElement == document.body) return true;
                else el = el.parentElement;
            }
            return false;
        }

        function insert_view(el,view_type,pack,parent_view){
            var _this = this;
            var projection = el.dataset["projection"];
            var view_name = el.dataset[view_type+"View"];
            if (view_name == "data-"+view_type+"-view") view_name = "";
            if (projection){
                var m_plugin = m.get_projection(projection)?m:parent_view.m;
                $(m_plugin).one("projection_updated."+projection, function(){
                    if (!check_presence_in_dom(el)) return;
                    insert_view.apply(_this,[el,view_type,pack,parent_view,m_plugin]);
                });
                $(m_plugin).one("projection_removed."+projection,function(){
                    if (el.muon_view instanceof m.View) el.muon_view.remove();
                    $(m_plugin).one("projection_updated."+projection, function(){
                        if (!check_presence_in_dom(el)) return;
                        insert_view.apply(_this,[el,view_type,pack,parent_view,m_plugin]);
                    });
                });
                projection = m_plugin.get_projection(projection);
                if (projection === undefined) return;
            }

            setTimeout(function(){
                if (el.muon_view instanceof m.View){
                    el.muon_view.remove();
                    delete el.muon_view;
                }
                try{
                    $.when(proc_projection[view_type].call(_this,el,el.dataset["context"],projection)).
                        then(function(context){
                            try {
                                context = context || {};
                                var View = m.get_view_by_name(view_type,view_name,context.model_name,pack);
                                var view_attrs = attrs_parser(el.dataset["viewAttrs"]);
                                view_attrs.__auto_generated__ = true;
                                view_attrs.package = pack;
                                view_attrs.plugin = _this.plugin;
                                new (View.extend(view_attrs))(context,el);
                            }
                            catch(e){
                                console.log(parent_view.template,el);
                                console.debug(e.stack);
                            }
                        });
                }
                catch(e){
                    console.log(parent_view.template,el);
                    console.debug(e.stack);
                }
            },0);

            this.innerHTML = "";
        }

        function get_translation(el){
            var translation = this.pack().translation[this.template+"_"+this.view_type+":"+el.dataset.tr];
            if (m.is_debug() && !translation) {$(el).addClass("untranslated");}
            else {$(el).removeClass("untranslated");}
            return translation || (m.is_debug()?"untranslated":"");
        }

        function render_focus(){
            var counter = 1;
            this.$("[data-focus]").each(function(){
                $(this).attr("tabindex",counter++);
            });
        }

        m.View = _b_.View.extend({
            tag_name: "div",
            profiles: [],
            toString: function(){
                return this.package+":"+this.view_type+":"+this.template;
            },
            initialize:function(context,_el_){
                __views_arr__.push(this);
                this.context = context || {};
                if (_el_ && _el_.nodeName) {
                    this.__forced_element = true;
                    this.el = _el_;
                    this.el.muon_view = this;
                }
                if (typeof this.init == "function") this.init.apply(this,arguments);
                this.render();
            },
            render_template: function(el){
                if (this.template){
                    var template = m.template_for_view(this);
                    if (!template) return;
                    $(el).jqoteapp(template.innerHTML,this.context);
                }
            },
            render_debug_labels: function(){
                if (!m.is_debug() || this.debug_label) return;
                this.debug_label = $("<div data-debug/>").text(this.package+":"+this.view_type+":"+(this.template||""))
                    .appendTo(this.el);
                this.debug_label.click(function(){
                    $(this).toggleClass("pinned");
                    $(this).parent().toggleClass("pinned");
                });
                this.render_translation();
            },
            render_translation: function(){
                var _this = this;
                var inner_trs =  this.$el.find("*[data-muon] *[data-tr]");
                this.$el.find("*[data-tr]").not(inner_trs).each(function(){
                    try{ this.innerHTML = get_translation.call(_this,this); }
                    catch(e){ console.log(e); }
                    if (!m.is_debug()) return;
                    this.debug_label = $("<div data-debug/>").text(_this.package+":"+_this.template+"_"+_this.view_type+":"+this.dataset.tr)
                        .appendTo(this);
                });
            },
            render_data_routes: function(){
                var _this = this;
                this.$el.find("a[data-route]").each(function(){
                    var route = this.dataset.route;
                    var pack_name = this.dataset.pack || _this.package;
                    if (!(pack_name in m.packages)) return;
                    if (m.packages[pack_name].router_path){
                        route = (m.packages[pack_name].router_path+"/"+route).replace(/\/{2,}/g,"/");
                        route = route.replace(/\^|\$/g,"");
                    }
                    $(this).attr("href",route)
                        .attr("data-pack",pack_name);
                });
            },
            render_src: function(){
                var _this = this;
                var inner_src =  this.$el.find("*[data-muon] *[data-src]");
                this.$el.find("*[data-src]").not(inner_src).each(function(){
                    this.src = "/pack_src/"+_this.package+"/"+this.dataset["src"]+"?muon";
                });
                if (m.__static_app__)
                    ["src","href"].map(function(a){
                        $("["+a+"]",_this.el).each(function(){
                            if (!/^\/\//.test($(this).attr(a))) $(this).attr(a,$(this).attr(a).replace(/^\//,""));
                        });
                    });
            },
            render:function(){
                var tagname = this.tag_name || "div";
                var _this = this;
                var $el = $("<"+tagname+" />");
                this.pre_template_render && this.pre_template_render();
                this.render_template($el[0]);
                if (this.el && this.el.muon_view == this){
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
                this.post_template_render && this.post_template_render();
                this.$el.addClass([this.class_name,this.view_type,"block"].join(" "));
                this.el.muon_view = this;
                this.el.dataset.muon = this.template?this.template+"_"+this.view_type:"";
                this.el.dataset.pack = this.package;
                render_focus.call(this);
                this.render_src();
                this.render_data_routes();
                this.render_translation();
                this.render_debug_labels();
                this.__set__ && this.__set__();
                for(var i in m.base_views){
                    var $els = this.$el.find("*[data-"+i+"-view]");
                    $els.each(function(){
                        insert_view.call(_this,this,i,this.dataset.pack || _this.package,_this);
                    });
                }
                this.rendered && this.rendered($el);
            },
            __remove_inner_views: function(){
                this.$("[data-muon]").each(function(){
                    if (this.muon_view instanceof m.View) this.muon_view.remove();
                });
            },
            remove: function(){
                delete this.el.muon_view;
                this.__remove_inner_views();
                if (this.__forced_element){
                    this.undelegateEvents();
                    this.$el.children().remove();
                }
                else this.$el.remove();
                this.stopListening();
                this.trigger("removed");
            },
            reload: function(){
                this.__remove_inner_views();
                this.render();
                this.__reset__ && this.__reset__();
                this.trigger("reloaded");
            },
            pack: function(){return m.packages[this.package];},
            surrogate: function(){return m.packages[this.package].package_obj.surrogate;},
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
         *  @name muon.view_type
         *  @private
         */
        view_type: "collection",
        /**
         * @constructor
         */
        initialize: function(collection){
            this.collection = collection;
            this.child_models = {};
            if (!this.model_view) this.model_view = this.template;
            if (_.isString(this.model_view)) this.model_view = m.get_view_by_name("model",this.model_view,collection.model_name,this.package);

            if (!this.model_view) throw Error("ModelView for collection view is not defined: "+this.template);
            this.listenTo(collection,"sync",this.__update_collection);
            this.listenTo(collection,"add",this.__add_to_collection);
            this.listenTo(collection,"remove",this.__remove_from_collection);
            this.listenTo(collection,"sort",this.__sorted);
            m.View.prototype.initialize.apply(this,arguments);
        },
        /**
         * Redefines basic muon.View 'remove' method
         *
         *
         */
        remove: function(){
            if (!this.collection.keep) delete __sync_names__[this.collection.sync_name];
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
            this._keep_children = this.target.children();
            this._keep_children_length = this._keep_children.length;
            this.__update_collection(this.collection);
        },
        /**
         * Checks whether collection is empty or not and sets corresponding DOM class to view DOM element (this.el)
         *
         * @method
         * @name __set_empty_flag_
         * @private
         */
        __set_empty_flag_: function(){
            if (this.collection.length == 0) this.$el.addClass("empty_collection").removeClass("non_empty_collection");
            else this.$el.removeClass("empty_collection").addClass("non_empty_collection");
        },
        /**
         * Private method that adds new ModelView to CollectionView as a reaction on "add" collection event.
         *
         * @method
         * @private true
         * @name  __add_to_collection
         * @class CollectionView
         * @param {Object} obj as;ldkfj;alskjdf;la
         * @param {Object} second asdf asdf
         * @private
         * @return {muon.CollectionView|null} asdfasdfklasfd
         */
        __add_to_collection: function(obj){
            this.__set_empty_flag_();
            var model = obj;
            if (this.target.children("#"+model.id).length == 0){
                var $model_view = new this.model_view(model);
                var after = this.target.children()[this.collection.models.indexOf(model)+this._keep_children_length];
                if (after)
                    $model_view.$el.before(after);
                else
                    this.target.append($model_view.$el);

                this.child_models[model.id] = $model_view;
            }
        },
        /**
         *
         * @param obj
         */
        __remove_from_collection: function(obj){
            this.__set_empty_flag_();
            if (obj.id in this.child_models)
                this.child_models[obj.id].remove();
        },
        /**
         *
         * @param {muon.Collection} collection
         */
        __update_collection: function(collection){
            this.__set_empty_flag_();
            if (collection != this.context) return;
            var _ = this;
            if (!this.model_view){
                throw Error("No model view specified");
            }
            var in_collection = [];
            for(var i in collection.models){
                var model = collection.models[i];
                in_collection.push("#"+model.id);
            }
            var to_remove = this.target.children().not(in_collection.join(", "));
            this._keep_children.each(function(){
                to_remove = to_remove.not(this);
            });
            to_remove.each(function(){
                _.child_models[$(this).attr("id")].remove();
                delete _.child_models[$(this).attr("id")];
            });
            var $model_view = null;
            for(var i in collection.models)
            {
                var model = collection.models[i];
                if (this.target.children("#"+model.id).length == 0){
                    var before = this.target.children()[i+this._keep_children_length];
                    $model_view = new this.model_view(model);
                    if (before) $model_view.$el.insertBefore(before);
                    else this.target.append($model_view.$el);
                    this.child_models[model.id] = $model_view;
                }
            }
        },
        /**
         * Triggers each time when collection __sorted
         * @method
         * @param {muon.Collection} collection
         */
        __sorted: function(collection){
            for(var i = 0; i < collection.length; i++){
                var model = collection.models[i];
                this.target.append(this.child_models[model.id].$el);
            }
        }

    });

    function set_get_element_value(view,getter){
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

    function update_model_view(attrs){
        var _this = this;
        if (this.$el.find("[data-model-attr]").length != 0){
            for(var i in attrs){
                var $sub_el = this.$el.find("[data-model-attr^='"+i+"']");
                if (!$sub_el.length) continue;
                $sub_el.each(function(){
                    var attrs_list = this.dataset["modelAttr"].split(".");
                    var attr_val = attrs[attrs_list.shift()];
                    try {
                        while(attrs_list.length != 0){
                            attr_val = attr_val[attrs_list.shift()];
                        }
                    }
                    catch(e){
                        attr_val = attr_val.toString();
                    }
                    if (!this.dataset["attrType"]) this.innerText = attr_val;
                    else if (this.dataset["attrType"] == "text") this.innerText = attr_val;
                    else if (this.dataset["attrType"] == "html") this.innerHTML = attr_val;
                    else $(this).attr(this.dataset["attrType"],attr_val);
                });
            }
        }
        this.$el.find("[data-model-get],[data-model-set]").each(function(){
            set_get_element_value.call(this,_this,this.dataset.modelGet || this.dataset.modelSet);
        });
        this.render_data_routes();
    }

    m.ModelView = m.View.extend({
        view_type: "model",
        initialize: function(model){
            var _this = this;
            this.model = model;
            this.listenTo(model,"change",this.__update__);
            this.listenTo(model,"destroy",_this.remove);
            m.View.prototype.initialize.apply(this,arguments);
        },
        __set__: function(){
            update_model_view.call(this,this.model.attributes);
            var view = this;
            this.$el.find("[data-model-set]").each(function(){
                var setter = this.dataset.modelSet;
                var _this = this;
                var int = null;
                view.listenTo(view.model,"sync",function(){
                    set_get_element_value.call(_this,view,setter);
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
            update_model_view.call(this,this.model.changedAttributes());
        },
        remove: function(){
            if (!this.model.collection){
                delete __sync_names__[this.sync_name];
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

    m.WidgetView = m.View.extend({view_type: "widget"});

    m.LayoutView = m.View.extend({
        view_type: "layout",
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
        remove_el: function(id){
            if (id in this.blocks){
                this.$("#"+id).html("");
                this.blocks[id].remove();
                delete this.blocks[id];
            }
        },
        update:function(blocks){
            var prev_block = this.blocks || {};
            for(var i in blocks){
                var block = blocks[i];
                if (i in prev_block) {
                    prev_block[i].remove();
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
        view_type: "stack",
        show_action_time: 500,
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
                if (this.current == i) view.trigger("view_shown");
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
        remove_el: function(id){
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
            function _hide_(){
                var i = _this.previous;
                if ('function' == typeof _this.hide_action) _this.hide_action(_this.views[_this.previous],_this.views[name],_show_);
                else{
                    _this.views[i].$el.hide();
                    _show_();
                }
            }

            function _show_(){
                var i = name;
                if ('function' == typeof _this.show_action) _this.show_action(_this.views[_this.previous],_this.views[name],_proceed_);
                else {
                    _this.views[i].$el.show();
                    _proceed_();
                }
            }
            function _proceed_(){
                _this.views[name].view_shown && _this.views[name].view_shown()
                _this.views[name].trigger("view_shown");
                if ('function' == typeof _this.post_show) _this.post_show();
            }
            if ('function' == typeof this.before_show) this.before_show();
            if (_this.previous != undefined && _this.previous != null){
                _this.views[name].view_hidden && _this.views[name].view_hidden()
                _this.views[_this.previous].trigger("view_hidden");
                _hide_();
            }
            else _show_();
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
             * Если ранее __application_view__ не был задан значит это самый первый созданный ApplicationStackView объект
             */
            if (!(m.__application_view__ instanceof m.ApplicationStackView))
                m.__application_view__ = this;
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
                else throw Error("Can't add not PageLayoutView instance to ApplicationStackView: "+view.template+"_"+view.view_type);
                return;
            }
            if (!view) view = alias;
            if (!(view instanceof m.PageLayoutView))
                throw Error("Can't add not PageLayoutView instance to ApplicationStackView: "+view.template+"_"+view.view_type);
            if (!view) alias = view.template;
            this.views[alias] = view;
            view.$el.hide();
            this.$target.append(view.$el);
        },
        add_pages: function(pages){
            var already_in = [];
            var layouts = this.pack().views.layout;
            for(var i in pages){
                var per_page_in = [];
                var q = pages[i];
                q = q.replace(/\-/g,"\\-");
                q = q.replace(/\*/g,"[a-zA-Z0-9\\-_]*").replace(/\?/g,"[a-zA-Z0-9\\-_]").replace(/\+/g,"[a-zA-Z0-9\\-_]+");
                q = q.replace(/\*/,"*?").replace(/\+/,"+?");
                q = new RegExp("^"+q+"_page$");
                for(var j in layouts){
                    if (already_in.indexOf(j) != -1) continue;
                    if (j.match(q)){
                        per_page_in.push(j);
                        already_in.push(j);
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
            return m.__static_app__?"/"+location.hash.replace(/^#/,""):location.pathname;
        },
        reload: function(){
            return this.navigate(this.path(),{replace: true,trigger:true});
        },
        navigate: function(url,opts){
            var _this = m.router;
            _.defer(function(){
                opts = opts || {};
                if (!("trigger" in opts)) opts.trigger = true;
                if (!(opts && opts.history_nav)){
                    __history__.push(_this.path());
                    __forward_history__ = [];
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
                _.defer(this.navigate,"/",{replace:true,trigger:true,history_nav: true});
                return false;
            }
            else {
                __forward_history__.unshift(this.path());
                _.defer(this.navigate,__history__.pop(),{replace:true,trigger:true,history_nav: true});
            }
            return true;
        },
        forward: function(){
            if (__forward_history__.length == 0) return false;
            __history__.push(this.path());
            _.defer(this.navigate,__forward_history__.shift(),{replace:true,trigger:true,history_nav: true});
            return true;
        }

    });

    function bind_surrogate(method,surrogate){
        if (typeof method == "string") method = surrogate[method];
        if (!method) return;
        return _.bind(method,surrogate);
    };

    var to_regexp = function(route){
        return _.isRegExp(route)?route:_b_.Router.prototype._routeToRegExp(route);
    };

    function add_pack_routes(pack,route,mod){
        var flatten_m = function(mid){return flatten_middleware(mid,mod.surrogate);};
        mod.middleware = flatten_m(mod.middleware);
        if (m.packages[pack].parent_pack && m.packages[pack].parent_pack.middleware )
            mod.middleware = flatten_m(mod.middleware.concat(m.packages[pack].parent_pack.middleware));
        m.packages[pack].middleware = mod.middleware;
        if (_.isObject(mod.routes) && !mod.routes.length){
            var route_keys = _.keys(mod.routes);
            for(var i in route_keys.reverse())
                add_route(pack,route,route_keys[i],bind_surrogate(mod.routes[route_keys[i]],mod.surrogate),mod.middleware);
        }
        else if (_.isArray(mod.routes)){
            for(var i in mod.routes.reverse()){
                var r_obj = mod.routes[i];

                if (_.isString(r_obj.package)){
                    if (!_.isString(r_obj.route)) {
                        throw Error("No route specified for dependency '"+r_obj.package+"' in package "+pack);
                    }
                    var pack_route = prepare_route(route,r_obj.route);
                    r_obj.package = (m.packages[pack].m.name?m.packages[pack].m.name+":":"")+r_obj.package;
                    m.router.route(pack_route,r_obj.package,m.require_pack(r_obj.package,null,pack));
                }
                else {
                    var route_middleware = flatten_m(mod.middleware.concat(r_obj.middleware));
                    if (_.isString(r_obj.redirect)){
                        add_redirect(pack,route,r_obj.route,r_obj.redirect);
                    }
                    else {
                        if (_.isString(r_obj.route) || _.isRegExp(r_obj.route))
                            add_route(pack,route,r_obj.route, bind_surrogate(r_obj.callback,mod.surrogate),
                                route_middleware,r_obj.page);
                        if (_.isObject(r_obj.routes)){
                            var route_keys = _.keys(r_obj.routes);
                            for(var j in route_keys.reverse()){
                                var callback = bind_surrogate(r_obj.routes[route_keys[j]],mod.surrogate);
                                add_route(pack,route,route_keys[j],callback,route_middleware,r_obj.page);
                            }
                        }
                    }
                }
            }
        }
    }

    function router_middleware(middleware,callback){
        if (middleware.length == 0) return callback();
        try {
            $.when(middleware.shift().call(m.router))
                .then(_.partial(router_middleware,middleware,callback),m.router.back);
        }
        catch(e){
            console.log(e.message);
            m.router.back();
        }
    }

    var prepare_route = function(sections){
        if (!_.isArray(sections)) sections = [].slice.call(arguments);
        var route = "";
        while (sections.length){
            var section = sections.shift();
            section = (section instanceof RegExp)?section:to_regexp(section.replace(/^\//,""));
            section = section.toString().replace(/(^\/\^)|(\$\/$)/g,"");
            route += (route?"/":"")+section;
        }
        return RegExp("^"+route+"$");
    };

    function add_route(pack,pref,route,handler,middleware,page){
        if (route === ""){
            m.router.route(prepare_route(pref),pack+"_"+route+"_redirect", function(){
                m.router.navigate(m.router.path()+"/",{trigger:true,replace:true});
            });
        }
        if (!_.isString(page)){
            var page_route = to_regexp(route).toString().replace(/(^\/\^)|(\$\/$)/g,"");
            page_route = page_route.substr(0,(page_route.indexOf("(") == -1)?page_route.length:page_route.indexOf("("));
            page_route = page_route.replace(/(^\/)|(\/$)/g,"");
            page = page_route.split("/").reverse().join("_");
            if (page.length == 0) page = "index";
        }
        var surrogate = m.packages[pack].package_obj.surrogate;
        m.router.route(prepare_route(pref,route),pack+"_"+route, function(){
            var _args = arguments;
            var page_to_show = page;
            var app_view = m.packages[pack].app_view;
            surrogate.current_page = undefined;
            try{surrogate.current_page = app_view.get(page_to_show+(/_page$/.test(page_to_show)?"":"_page"));}
            catch(e){}
            router_middleware(middleware.slice(),function(){
                handler && handler.apply(surrogate,_args);
                do {
                    try{ app_view.show(page_to_show); }
                    catch(e){console.log(e.stack);break;}
                    page_to_show = app_view.__parent_app_page;
                } while(app_view = app_view.__parent_app_view);
            });
        });
    }

    function add_redirect(pack,pref,route,redirect_url){
        function redirect(){
            m.router.navigate(redirect_url,{trigger:true,replace:true});
        }
        if (route === ""){
            m.router.route(prepare_route(pref),pack+"_"+route+"_redirect", function(){
                m.router.navigate(m.router.path()+"/",{trigger:true,replace:true});
            });
        }
        m.router.route(prepare_route(pref,route),pack+"_"+route,redirect);
    }

    function flatten_middleware(middl,surrogate){
        return _.flatten([middl]).filter(function(m){return typeof m == "function";}).map(function(f){return _.bind(f,surrogate);});
    }

    function proc_unhandled_views(pack){
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
            var view_class_obj = null;
            if (name == "application" && type == "stack")
                view_class_obj = m.ApplicationStackView;
            else if (name.match(/_page$/) && type == "layout")
                view_class_obj = m.PageLayoutView;
            else if (type in m.base_views)
                view_class_obj = m.base_views[type];
            if (!view_class_obj) return;
            view_class_obj.extend({template: name,package:pack});
        });
    }

    function proc_profiled_views(pack){
        $("script[data-pack='"+pack+"'][type='text/muon-template'][data-profile]").each(function(){
            var name = this.id.replace(/_template$/,"");
            var type = name.match(/_([a-zA-Z0-9]*?)$/)[1];
            name = name.replace(RegExp("_"+type+"$"),"");
            m.packages[pack].views[type][name].profiles = m.packages[pack].views[type][name].profiles || [];
            m.packages[pack].views[type][name].profiles.push(this.dataset.profile);
            if (!(__profiles__[this.dataset.profile] instanceof Array)) __profiles__[this.dataset.profile] = [];
            __profiles__[this.dataset.profile].push("."+name+"_"+type+"[data-pack='"+pack+"']");
        });
    }

    m.require_pack = function(pack,callback,parent_pack){
        if (pack in m.packages) return function(){};
        var fallback_path = "";
        var plugin_name = pack.substr(0,pack.lastIndexOf(":"));
        var route = null, full_route = null;

        function proc_loaded_package(){
            var mod = m.packages[pack].package_obj;
            m.packages[pack].parent_pack = m.packages[parent_pack||""];
            mod.surrogate = mod.surrogate || {};
            mod.surrogate.m = __plugins__[plugin_name];
            proc_unhandled_views(pack);
            proc_profiled_views(pack);
            if (route){
                _b_.history.handlers = _b_.history.handlers.filter(function(obj){
                    if (obj.route.toString() == to_regexp(route).toString() ||
                        obj.route.toString() == to_regexp(full_route).toString()) return false;
                    return true;
                });
                __routes__ = __routes__.filter(function(obj){
                    return (obj.callback == fallback)?false:true;
                });
                add_pack_routes(pack,route,mod);
            }
            function form_pack_application_layout(){
                mod.use_app_view = mod.use_app_view || true;
                if (mod.use_app_view){
                    var app_view_class = null;
                    if (m.packages[pack].views.stack && m.packages[pack].views.stack.application)
                        app_view_class = m.packages[pack].views.stack.application;
                    else
                        app_view_class = m.ApplicationStackView.extend({package:pack});
                    var app_view = m.packages[pack].app_view = new app_view_class;
                    if (m.__application_view__ == app_view) app_view.$el.appendTo("body");
                    else {
                        if (m.packages[parent_pack]
                            && m.packages[parent_pack].app_view instanceof m.ApplicationStackView)
                        {
                            var page = new m.PageLayoutView();
                            var page_name = app_view.__parent_app_page = "m_"+getUniq()+"_page";
                            app_view.__parent_app_view = m.packages[parent_pack].app_view;
                            page.el.appendChild(app_view.el);
                            app_view.__parent_app_view.add(page_name,page);
                        }
                    }
                    window.a = app_view_class;
                    app_view.add_pages(mod.pages || ["*"]);
                }
                _.defer(function(){
                    _b_.history.loadUrl();
                });
            }

            if (typeof mod.ready == "function") _.defer(mod.ready.bind(mod.surrogate),form_pack_application_layout);
            else form_pack_application_layout();
        };

        function pack_loaded(){
            m.__prev_package__ = m.__current_package__;
            m.__prev_plugin__ = m.__current_plugin__;
            m.__current_package__ = pack;
            m.__current_plugin__ = plugin_name;
            var pack_obj = new MuonPackage(pack);
            m.packages[pack] = pack_obj;
            pack_obj.router_path = route;
            pack_obj.loaded = true;
            var plugin_obj = __registerPlugin(m.__current_plugin__);
            pack_obj.m = plugin_obj;
            plugin_obj = __plugins__[""];
            var plugin_stack = plugin_name.split(":");
            for(var i in plugin_stack){
                var shorter_name = pack.substr(pack.indexOf(":")+1);
                if (plugin_stack[i] != "") plugin_obj = plugin_obj.plugins[plugin_stack[i]];
                plugin_obj.packages[shorter_name] = pack_obj;
            }

            for(var i in m.__package_init_data[pack].dependencies.css){
                var css = m.__package_init_data[pack].dependencies.css[i];
                $("<style />").text(css).appendTo("head");
            }
            for(var i in m.__package_init_data[pack].dependencies.js){
                eval(m.__package_init_data[pack].dependencies.js[i]);
            }

            for(var i in m.__package_init_data[pack].models){
                if (i in m.models) continue;
                else eval(m.__package_init_data[pack].models[i]);
            }

            for(var i in m.__package_init_data[pack].views){
                $(m.__package_init_data[pack].views[i]).appendTo(document.head);
            }

            m.packages[pack].package_obj = m.__package_init_data[pack].package;
            m.packages[pack].translation = m.__package_init_data[pack].translation;
            proc_loaded_package();
            m.__current_package__ = m.__prev_package__;
            m.__current_plugin__ = m.__prev_plugin__;
            delete m.__prev_package__;
            delete m.__prev_plugin__;
        }

        var fallback = function(){
            fallback_path = m.router.path();
            if (m.packages[pack] && m.packages[pack].loaded){return;}
            if (m.__package_init_data[pack]) pack_loaded();
            else {
                var callback_name = "muon_callback_"+Date.now();
                m[callback_name] = function(){
                    pack_loaded();
                    delete m[callback_name];
                };
                var scrpt = $("<script />");
                scrpt.attr("src","/pack/"+pack+"?muon&lang="+ m.get_language()+"&m_callback="+callback_name);
                scrpt.appendTo(document.head);
            }
        };

        _.defer(function(){
            var routes = _.where(__routes__,{callback:fallback});
            if (routes.length != 0){
                route = routes[0].route;
                full_route = prepare_route([route,"/*a"]);
                m.router.route(full_route,getUniq(),fallback);
            }
            else _.defer(fallback);
            callback && callback();
        });

        return fallback;
    };

    m.router = new m.Router();
    $(function(){
        if (m.__static_app__ && !/^file/.test(location.protocol) && location.pathname.replace(/^\//,"")){
            location.pathname = "/";
            return;
        }
        m.router.route("/","#{default_pack}",m.require_pack("application",function(){
            _b_.history.start(m.__static_app__?{}:{pushState:true});
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
