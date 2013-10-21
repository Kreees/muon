module.exports = {
    url: "device",
    attrs: {
        "ostype": {
            type: "string",
            default: "unknown"
        },
        "secret_key": {
            type: "md5",
            default: function(){return generate_key();}
        },
        "program_version": {
            type: "string",
            default_value: "0.0.0",
            validation: /(\d+\.)*\d+/
        },
        "program_modules":{
            type: ["modules"]
        },
        "sessions": {
            type: ["sessions"]
        }
    }
};