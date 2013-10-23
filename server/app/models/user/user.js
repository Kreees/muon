module.exports = {
    attrs: {
       "nick": {
           type: "string",
           null_allowed: false,
           default: ""
       },
       "password": {
           type: "md5",
           null_allowed: false,
           default: ""
       },
       "email":{
           type: "email",
           null_allowed: true,
           default: ""
       },
       "roles": {
           type: ["user.role"],
           default: []
       }
    },
    objects: ["me"]
}