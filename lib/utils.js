var utils = {
    _: require("underscore"),
    orm: require("orm"),
    Q: require("q"),
    express: require("express"),
    enforce: require("orm").enforce,
    fs: require("fs"),
    path: require("path"),
    url: require("url")
};

for(var i in utils) Object.defineProperty(utils,i,{value: utils[i]});

module.exports = utils;