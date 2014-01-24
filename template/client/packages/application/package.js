module.exports = {
    useAppLayout: true,
    pages: ["*"],
    models: ["*"],
    middleware: [],
    routes: [
        {
            route: ""
        },
        {
            route: "*a",
                page: "error"
        }
    ],
    surrogate: {}
}
