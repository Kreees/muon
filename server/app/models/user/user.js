module.exports = {
    attrs: {
       "name": {
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
       }
    }
}