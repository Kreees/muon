module.exports = {
    attrs: {
        "nick": {
            type: "string",
            null_allowed: false,
            defaults: ""
        },
        "password": {
            type: "md5",
            null_allowed: false,
            defaults: ""
        },
        "email":{
            type: "email",
            null_allowed: true,
            defaults: ""
        },
        "roles": {
            type: ["user.role"],
            defaults: []
        }
    }
}