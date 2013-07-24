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
    surrogate: {}
};