module.exports = {
    middleware: [
        function(){
            if (m.hasProfile("first_user") || m.hasProfile("logined")) return;
            var dfd = $.Deferred();
            var a = this.m.models["user.user"].collection();
            a.fetch().then(function(a){
                m.setProfile("first_user",a.length == 0);
                dfd.resolve();
            });
            return dfd.promise();
        },
        function(){
            if (m.hasProfile("first_user") || !m.hasProfile("logined")) return;
            if (this.m.getProjection("admin.config")) return;
            var dfd = $.Deferred();
            var _this = this;
            var config = new this.m.models["project.project"]("config");
            config.fetch().then(function(){
                if (config.get("server_mode") == "production") m.setProfile("admin_production");
                else {
                    if (config.get("wait_restart")) m.setProfile("admin_need_restart");
                    else
                        config.once("change:wait_restart",function(){
                            if (config.get("wait_restart")) m.setProfile("admin_need_restart");
                        })
                    _this.m.setProjection("admin.config",config);
                    _.defer(m.setProfile.bind(m),"admin_config");
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
                m.removeProfile("model_admin");
                var a = this.m.getProjection("admin.models");
                if (!a){
                    a = this.m.models["project.server.model"].collection();
                    this.m.setProjection("admin.models",a);
                }
//                console.log(a);
                a.fetch();
            },
            routes: { "server/models/:name": "model" }
        },
        {
            route: "server/plugins",
            callback: function(){m.removeProfile("server_plugin_admin");},
            routes: { "server/plugins/:name": "server_plugin" }
        },
        {route: "client"},
        {
            route: "client/packages",
            callback: function(){m.removeProfile("package_admin");},
            routes: { "client/packages/:name": "package" }
        },
        {
            route: "client/pages",
            callback: function(){m.removeProfile("page_admin");},
            routes: { "client/pages/:name": "page" }
        },
        {
            route: "client/plugins",
            callback: function(){m.removeProfile("client_plugin_admin");},
            routes: { "client/plugins/:name": "client_plugin" }
        },
        {
            route: "client/views",
            callback: function(){m.removeProfile("view_admin");},
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
            m.setProfile("model_admin");
            this.m.setProjection("model_admin",new this.m["project.server.model"](a));
        },
        "server_plugin": function(a){
            m.setProfile("server_plugin_admin");
            this.m.setProjection("server_plugin_admin",new this.m["project.server.plugin"](a));
        },
        "package": function(a){
            m.setProfile("package_admin");
            this.m.setProjection("package_admin",new this.m["project.client.package"](a));
        },
        "page": function(a){
            m.setProfile("page_admin");
            this.m.setProjection("page_admin",new this.m["project.client.page"](a));
        },
        "client_plugin": function(a){
            m.setProfile("client_plugin_admin");
            this.m.setProjection("client_plugin_admin",new this.m["project.client.plugin"](a));
        },
        "view": function(a){
            m.setProfile("view_admin");
            this.m.setProjection("view_admin",new this.m["project.client.view"](a));
        }
    },
    ready: function(next){
        var _this = this;
        this.m.model_user_user.get("me").then(function(a){
            _this.m.setProjection("admin.logined",a);
            m.setProfile("logined");
            next();
        },next);
    }
};