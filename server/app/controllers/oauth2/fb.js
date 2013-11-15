var monthes = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
var days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

var sup = m.super;
var controller = sup.extend({
    actions: {
        channelUrl: function(req,res){
            var expire = 3600*24*365;
            res.set("pragma","public");
            res.set("cache-control","max-age="+expire);
            res.set("expires",new Date(Date.now()+expire*1000).toUTCString());
            res.end("<script src='http://connect.facebook.net/en_US/all.js'></script>");
        }
    }
});

module.exports = controller;