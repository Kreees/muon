module.exports = {
    middleware: [
        function(){
            var _this = this;
            var dfd = $.Deferred();
            if (!this.admin_users){
                this.admin_users = new m.Collection(null,{url: "/apis/user.user/"});
                this.admin_users.fetch().then(function(){
                    if (_this.admin_users.length == 0) m.add_profile("first_user")
                    dfd.resolve();
                });
            }
            else {
                console.log("Here");
                if (_this.admin_users.length == 0) m.add_profile("first_user")
                _.defer(dfd.resolve);
            }
            return dfd.promise();
        }
    ],
    routes: [
        {
            route: ""
        },
        {
            route: "server",
            package: "server_admin"
        },
        {
            route: "client",
            package: "client_admin"
        }
    ],
    ready: function(cb){
        cb();
    }
};