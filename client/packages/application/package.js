module.exports = {
    dependencies: [],
    name: "application",
    models: ["*"],
    use_app_layout: true,
    pages: ["*"],
    routes: [
        {
            "route": ""
        },
        {
            "route": "admin",
            "package": "admin"
        },
        {
            "route": "cabinet"
        },
        {
            "route": "muon_login",
            "redirect": "/cabinet"
        },
        {
            "route": "*a",
            "page": "not_found"
        }
    ],
    ready: function(next){
        var a = new m.model_user_user("me");
        a.fetch().then(function(a){
            m.set_projection("logined_user",a);
            m.set_profile("logined");
            next();
        },next);
    }
};