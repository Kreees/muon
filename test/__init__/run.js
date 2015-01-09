global.chai = require("chai");
global.should = require("chai").should();
global.expect = require("chai").expect;
global.Q = require('q');
global._ = require('underscore');
global.async = require("async");

var tests = {};
var fs = require("fs"),
    path = require("path");
var testPath = path.normalize(__dirname+"/..");

var testDirs = fs.readdirSync(testPath);

for(var i in testDirs){
    var test = testDirs[i];
    if (/^_/.test(testDirs[i])) continue;
    var f = fs.statSync(testPath+"/"+test);
    if (!f.isDirectory()) continue;
    tests[testDirs[i]] = {path: testPath+test};
    var files = fs.readdirSync(testPath+test);
    tests[test].modules = files.filter(function(a){
        return /.js$/.test(a) && !/^\./.test(a) && !/^_/.test(a) ;
    });
}

describe('Run MUON complete test:',function(){
    before(function(done){
        m.ready(done);
    });

    for(var i in tests){
        describe(i+":",function(){
            tests[i].modules.forEach(function(a){
                if (!/x\./.test(a)) describe(a+": ",function(){ require(tests[i].path+"/"+a); })
                else xdescribe(a+": ",function(){ require(tests[i].path+"/"+a); })
            })
        });
    }
})