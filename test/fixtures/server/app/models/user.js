module.exports = {
    attributes: {
        "nick": "text",
        "password": "text",
        "email": "text"
    },
    objects: ["obj1","obj2","obj3"],
    scopes: ["scope1","scope2"],
    hasOne: {
        "parent": {
            type: "other_user",
            reverse: "users"
        }
    },
    hasMany: {
        "dummies": "other_user"
    }
}