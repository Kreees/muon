module.exports = {
    attrs: {
       "nick": {
           type: "string",
           null_allowed: false
       },
       "password": {
           type: "md5",
           null_allowed: false
       },
       "email":{
           type: "email",
           null_allowed: true
       },
       "roles": {
           type: ["user.role"],
           default: []
       }
    },
    objects: ["me"]
}