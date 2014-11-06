global.chai = require("chai");
global.should = require("chai").should();
global.expect = require("chai").expect;
chai.use(require("chai-spies"));
global.Q = require('q');
global._ = require('underscore');
//global.httpMock = require("../../lib/testing/http_mock");
global.__mcfg__ = { serverMode: "testing"};
global.async = require("async");
require("../../module");

