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
            "route": "*a",
            "page": "not_found"
        }

    ],
    surrogate: {}
};