module.exports = {
    models: [
        "user.oauth2.google",
        "user.user",
        "user.session",
    ],
    ready: function(next){
        next();
    },
    middleware: []
}