global.chai = require("chai");
global.should = require("chai").should();
global.expect = require("chai").expect;
chai.use(require("chai-spies"));
global.Q = require('q');
global._ = require('underscore');
global.__mcfg__ = { serverMode: "testing" }
require("muon");

