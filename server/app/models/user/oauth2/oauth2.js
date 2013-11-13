module.exports = {
    url: false,
    attrs: {
        "user": {
            type: "user.user",
            null_allowed: true,
            defaults: null
        },
        expired: {
            type: "date",
            null_allowed: false,
            defaults: function(){
                return new Date()
            }
        },
        user_token: {
            type: "string",
            null_allowed: true,
            defaults: null
        }
    }
}