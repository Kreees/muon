module.exports = {
    middleware: [
        function(){
            var dfd = $.Deferred();
            var a = new m.Collection(null,{url: "/apis/user.user/"});
            a.fetch().then(function(a){
                m.set_profile("first_user",a.length == 0);
                dfd.resolve();
            });
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