var httpMock = require("node-mocks-http");
var express = require("express");

module.exports = {
    createRequest: function(descr){
        var req = httpMock.createRequest(descr);
        req.__proto__ = express.request;
        var targetAction = "get";
        if(req.method == "GET") targetAction = "get"
        if(req.method == "POST") targetAction = "create";
        if(req.method == "PUT") targetAction = "edit";
        if(req.method == "DELETE") targetAction = "remove";
        if (req.query.__action__) targetAction = req.query.__action__;

        var name = descr.name || descr.id || null;

        req.context = {
            controller: descr.controller || null,
            target: descr.target|| null,
            action: targetAction,
            model: descr.model || null,
            name: name,
            id: name,
            middleware: descr.middleware || [],
            permissions: descr.permissions || [],
            plugin: descr.plugin || [],
            data: descr.data || (m._.isEmpty(req.body)?req.body:req.query) || {}
        };
        return req;
    },
    createResponse: function(callback){
        var res = httpMock.createResponse();
        res.__proto__ = express.response;
        var __end = res.end;
        res.end = function(){
            __end.apply(res,arguments);
            callback && _.defer(callback,res);
        }
        return res;
    }
}