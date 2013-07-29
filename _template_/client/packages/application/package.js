module.exports = {
    use_app_layout: true,
    pages: ["*"],
    models: ["*"],
    middleware: [],
    routes: [
        {
            route: "",
        },
        {
            route: "admin",
            package: "MUON:admin"
        }
    ],
    surrogate: {}
}