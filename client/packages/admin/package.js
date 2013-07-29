module.exports = {
    middleware: [
        function(){
            try{
                if (m.has_profile("first_user") || m.has_profile("logined")) return;
                var dfd = $.Deferred();
                var a = this.m.models["user.user"].collection();
                a.fetch().then(function(a){
                    m.set_profile("first_user",a.length == 0);
                    dfd.resolve();
                });
                return dfd.promise();
            }
            catch(e){
                console.log(e.stack);
            }
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
    ready: function(next){
        var a = new this.m.model_user_user("me");
        a.fetch().then(function(a){
            m.set_projection("logined_user",a);
            m.set_profile("logined");
            next();
        },next);
    }

};