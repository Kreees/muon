#!/usr/bin/env node

global.m = require("../lib/m_init");
var fs = require("fs"),
    q = require("q"),
    tar = require("tar"),
    zlib = require("zlib"),
    fstream = require("fstream"),
    fs_ext = require("../lib/utils/fs/fs_ext"),
    mime = require("mime"),
    crypt = require("crypto");

var server = require("../lib/server.js");

server.init(function(){
    process.exit();
});