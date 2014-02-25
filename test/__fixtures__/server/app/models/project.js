module.exports = {
    attributes: {
        "name": "text",
        "finished": "boolean"
    },
    scopes: ["finished","unfinished"],
    hasOne: {
        "owner": "user"
    }
}