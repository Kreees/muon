#!/usr/bin/env node

var muon = require('./../module');
muon.ready(function(){
    var repl = require("repl").start('>');
    var context = repl.context;
    context.m = muon;
    require('repl.history')(repl, process.env.HOME + '/.node_history');
    repl.on('exit', function () { process.exit(); });
});
//context.underscore = require('underscore');

