module.exports = {
    use_app_layout: true,
    pages: ["*"],
    models: ["*"],
    middleware: [],
    routes: [
        {route: ""},
	{
	    route: "*a",
            page: "error"
	}
    ],
    surrogate: {}
}
