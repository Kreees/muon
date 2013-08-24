module.exports = {
    middleware: [
        function(){
            if (m.has_profile("first_user") || m.has_profile("logined")) return;
            var dfd = $.Deferred();
            var a = this.m.models["user.user"].collection();
            a.fetch().then(function(a){
                m.set_profile("first_user",a.length == 0);
                dfd.resolve();
            });
            return dfd.promise();
        },
        function(){
            if (m.has_profile("first_user") || !m.has_profile("logined")) return;
            if (this.m.get_projection("admin.config")) return;
            var dfd = $.Deferred();
            var _this = this;
            var config = new this.m.models["project.project"]("config");
            config.fetch().then(function(){
                if (config.get("server_mode") == "production") m.set_profile("admin_production");
                else {
                    if (config.get("wait_restart")) m.set_profile("admin_need_restart");
                    else
                        config.once("change:wait_restart",function(){
                            if (config.get("wait_restart")) m.set_profile("admin_need_restart");
                        })
                    _this.m.set_projection("admin.config",config);
                    _.defer(m.set_profile.bind(m),"admin_config");
                }
                dfd.resolve();
            },function(){
                dfd.resolve();
            })
            return dfd.promise();
        }
    ],
    routes: [
        {route: ""},
        {route: "server"},
        {
            route: "server/models",
            callback: function(){
                m.remove_profile("model_admin");
                var a = this.m.get_projection("admin.models");
                if (!a){
                    a = this.m.models["project.server.model"].collection();
                    this.m.set_projection("admin.models",a);
                }
//                console.log(a);
                a.fetch();
            },
            routes: { "server/models/:name": "model" }
        },
        {
            route: "server/plugins",
            callback: function(){m.remove_profile("server_plugin_admin");},
            routes: { "server/plugins/:name": "server_plugin" }
        },
        {route: "client"},
        {
            route: "client/packages",
            callback: function(){m.remove_profile("package_admin");},
            routes: { "client/packages/:name": "package" }
        },
        {
            route: "client/pages",
            callback: function(){m.remove_profile("page_admin");},
            routes: { "client/pages/:name": "page" }
        },
        {
            route: "client/plugins",
            callback: function(){m.remove_profile("client_plugin_admin");},
            routes: { "client/plugins/:name": "client_plugin" }
        },
        {
            route: "client/views",
            callback: function(){m.remove_profile("view_admin");},
            routes: { "client/views/:name": "view" }
        },
        {route: "data"},
        {route: "users"},
        {route: "market"},
        {route: "logs"},
        {route: "profile"},
        {
            route: "*a",
            page: "error"
        }
    ],
    surrogate: {
        "model": function(a){
            m.set_profile("model_admin");
            this.m.set_projection("model_admin",new this.m["project.server.model"](a));
        },
        "server_plugin": function(a){
            m.set_profile("server_plugin_admin");
            this.m.set_projection("server_plugin_admin",new this.m["project.server.plugin"](a));
        },
        "package": function(a){
            m.set_profile("package_admin");
            this.m.set_projection("package_admin",new this.m["project.client.package"](a));
        },
        "page": function(a){
            m.set_profile("page_admin");
            this.m.set_projection("page_admin",new this.m["project.client.page"](a));
        },
        "client_plugin": function(a){
            m.set_profile("client_plugin_admin");
            this.m.set_projection("client_plugin_admin",new this.m["project.client.plugin"](a));
        },
        "view": function(a){
            m.set_profile("view_admin");
            this.m.set_projection("view_admin",new this.m["project.client.view"](a));
        }
    },
    ready: function(next){
        var _this = this;
        var a = new this.m.model_user_user("me");
        a.fetch().then(function(a){
            _this.m.set_projection("admin.logined",a);
            m.set_profile("logined");
            next();
        },next);
    }
};