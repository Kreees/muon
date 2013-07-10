module.exports = {
    use_app_layout: true,
    pages: ["*"],
    models: ["*"],
    middleware: [],
    routes: [
        {
            route: "",
            redirect: "start"
        },
        {
            route: "start"
        }
    ],
    surrogate: {}
}