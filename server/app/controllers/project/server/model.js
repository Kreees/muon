var fs = require("fs"),
    Q = require("q"),
    _ = require("underscore");

function wrap_model(obj){
    if (!obj) return;
    return {
        _id: obj.model_name,
        name: obj.model_name,
        attrs: obj.attrs || {},
        scopes: _.keys(obj.s || {}),
        objects: _.keys(obj.o || {})
    };
}

function model_copy(dst,src){
    for(var i in src){
//        if (i in dst){
//            typeof
//        }
//        else
        if (["_id","name"].indexOf(i) == -1)
            dst[i] = src[i];
    }
    return dst;
}

var middleware_init_data = "";
middleware_init_data += "module.exports = function(req,res,next){\n";
middleware_init_data += "\tnext();\n";
middleware_init_data += "};\n";


var initializers_init_data = "";
initializers_init_data += "module.exports = function(cfg,next){\n";
initializers_init_data += "\tnext();\n";
initializers_init_data += "};\n";

var controller_init_data = "";
controller_init_data += "module.exports = m.rest.extend({\n";
controller_init_data += "\tpermissions: [\"all\"],\n";
controller_init_data += "\tdependencies: [],\n";
controller_init_data += "\tdecorator: false,\n";
controller_init_data += "\tactions: {\n";
controller_init_data += "\t\t\"create\":function(req,res){\n";
controller_init_data += "\t\t\treturn m.rest.actions.create.apply(this,arguments);\n";
controller_init_data += "\t\t},\n";
controller_init_data += "\t\t\"edit\":function(req,res){\n";
controller_init_data += "\t\t\treturn m.rest.actions.edit.apply(this,arguments);\n";
controller_init_data += "\t\t},\n";
controller_init_data += "\t\t\"get\":function(req,res,id){\n";
controller_init_data += "\t\t\treturn m.rest.actions.get.apply(this,arguments);\n";
controller_init_data += "\t\t},\n";
controller_init_data += "\t\t\"delete\":function(req,res,id){\n";
controller_init_data += "\t\t\treturn m.rest.actions.delete.apply(this,arguments);\n";
controller_init_data += "\t\t},\n";
controller_init_data += "\t\t\"index\":function(req,res){\n";
controller_init_data += "\t\t\treturn m.rest.actions.index.apply(this,arguments);\n";
controller_init_data += "\t\t},\n";
controller_init_data += "\t\t\"search\":function(req,res){\n";
controller_init_data += "\t\t\treturn m.rest.actions.search.apply(this,arguments);\n";
controller_init_data += "\t\t},\n";
controller_init_data += "\t}\n";
controller_init_data += "});\n";

var scope_init_data = "";
scope_init_data += "module.exports = m.super.extend({\n";
scope_init_data += "\tpermissions: [\"all\"],\n";
scope_init_data += "\tdependencies: [],\n";
scope_init_data += "\tdecorator: false,\n";
scope_init_data += "\twhere: {_id: {$nin: []}},\n";
scope_init_data += "\tactions: {\n";
scope_init_data += "\t\t\"create\":function(req,res){\n";
scope_init_data += "\t\t\treturn m.rest.actions.create.apply(this,arguments);\n";
scope_init_data += "\t\t},\n";
scope_init_data += "\t\t\"edit\":function(req,res){\n";
scope_init_data += "\t\t\treturn m.rest.actions.edit.apply(this,arguments);\n";
scope_init_data += "\t\t},\n";
scope_init_data += "\t\t\"get\":function(req,res,id){\n";
scope_init_data += "\t\t\treturn m.rest.actions.get.apply(this,arguments);\n";
scope_init_data += "\t\t},\n";
scope_init_data += "\t\t\"delete\":function(req,res,id){\n";
scope_init_data += "\t\t\treturn m.rest.actions.delete.apply(this,arguments);\n";
scope_init_data += "\t\t},\n";
scope_init_data += "\t\t\"index\":function(req,res){\n";
scope_init_data += "\t\t\treturn m.rest.actions.index.apply(this,arguments);\n";
scope_init_data += "\t\t},\n";
scope_init_data += "\t\t\"search\":function(req,res){\n";
scope_init_data += "\t\t\treturn m.rest.actions.search.apply(this,arguments);\n";
scope_init_data += "\t\t},\n";
scope_init_data += "\t}\n";
scope_init_data += "});\n";

var object_init_data = "";
object_init_data += "module.exports = m.super.extend({\n";
object_init_data += "\tpermissions: [\"all\"],\n";
object_init_data += "\tdependencies: [],\n";
object_init_data += "\tdecorator: false,\n";
object_init_data += "\tactions: {\n";
object_init_data += "\t\t\"create\":function(req,res){\n";
object_init_data += "\t\t\treturn m.rest.actions.create.apply(this,arguments);\n";
object_init_data += "\t\t},\n";
object_init_data += "\t\t\"edit\":function(req,res){\n";
object_init_data += "\t\t\treturn m.rest.actions.edit.apply(this,arguments);\n";
object_init_data += "\t\t},\n";
object_init_data += "\t\t\"get\":function(req,res,id){\n";
object_init_data += "\t\t\treturn m.rest.actions.get.apply(this,arguments);\n";
object_init_data += "\t\t},\n";
object_init_data += "\t\t\"delete\":function(req,res,id){\n";
object_init_data += "\t\t\treturn m.rest.actions.delete.apply(this,arguments);\n";
object_init_data += "\t\t}\n";
object_init_data += "\t}\n";
object_init_data += "});\n";

var model_init_data = "";
model_init_data += "module.exports = {};\n";

function create_path(name,dir_prefix,file_data){
    var name_parts = name.split("/");
    var target_name = name_parts.pop();
    for(var i in name_parts){
        dir_prefix += "/"+name_parts[i];
        if (!fs.existsSync(m.cfg.path+dir_prefix))
            fs.mkdirSync(m.cfg.path+dir_prefix);
    }
    var model_file_name = m.cfg.path+dir_prefix+"/"+target_name+".js";
    if (!fs.existsSync(model_file_name)) fs.writeFileSync(model_file_name,file_data || "");
}

var obj = {
    dependencies: [
        "user.user"
    ],
    permissions: function(req,res){
        if (!this.user) return [];
        return ["all"];
    },
    actions: {
        "get": function(req,res,value){
            return wrap_model(m.models[value]);
        },
        "create": function(req){
            if (req.method == "GET") var body = req.query
            else var body = req.body;
            var dfd = Q.defer();
            if (!body.name) {
                _.defer(dfd.reject,"No name specified");
                return dfd.promise;
            }
            var name = body.name;
            if (m.models[name] && this.$action == "create"){
                _.defer(dfd.reject,"Model already exist");
                return dfd.promise;
            }
            if (!/^([a-zA-Z0-9_]+\.)*[a-zA-Z0-9_]+$/.test(name)) {
                _.defer(dfd.reject,"Wrong model name");
                return dfd.promise;
            }
            var file_path = name.replace(/\./g,"/");
            var full_file_path = m.cfg.path+"/server/app/models/"+file_path+".js";
            create_path(file_path,"/server/app/models",model_init_data);
            create_path(file_path,"/server/app/controllers",controller_init_data);
            create_path(file_path,"/server/app/middleware",middleware_init_data);
            create_path(file_path,"/server/app/initialisers",initializers_init_data);
            var model_obj = model_copy(require(full_file_path),body);
            model_obj.o = {}; model_obj.s = {};
            for(var i in model_obj.scopes || []){
                create_path(file_path+"/"+model_obj.scopes[i],"/server/app/controllers",scope_init_data);
                model_obj.s[model_obj.scopes[i]] = {};
            }

            for(var i in model_obj.objects || []){
                create_path(file_path+"/"+model_obj.objects[i],"/server/app/controllers",object_init_data);
                model_obj.o[model_obj.objects[i]] = {};
            }
            var model_data = "module.exports = "+JSON.stringify(model_obj,null,4) +";\n";
            fs.writeFileSync(full_file_path,model_data);
            model_obj.model_name = name;
            _.defer(dfd.resolve,wrap_model(model_obj));
            return dfd.promise;
        },
        "edit": function(req,res,value){
            if (!m.models[value]) return;
            if (req.method == "GET") req.query.name = value;
            else req.body.name = value;
            return obj.actions.create.apply(this,arguments)
        },
        "delete": function(req,res,value){
            if (!m.models[value]) return;
            var dfd = Q.defer();
            var file_path = value.replace(/\./g,"/");
            fs.unlink(m.cfg.path+"/server/app/models/"+value.replace(/\./g,"/")+".js",function(e,data){
                if (e) dfd.reject(e);
                if (req.query.force){
                    try {fs.unlinkSync(m.cfg.path+"/server/app/controller/"+file_path+".js");}catch(e){}
                    try {fs.unlinkSync(m.cfg.path+"/server/app/initialisers/"+file_path+".js");}catch(e){}
                    try {fs.unlinkSync(m.cfg.path+"/server/app/middleware/"+file_path+".js");}catch(e){}
                    var scopes = _.keys(m.models[value].s);
                    var objects = _.keys(m.models[value].o);
                    for(var i in scopes)
                        try {fs.unlinkSync(m.cfg.path+"/server/app/middleware/"+file_path+"/"+scopes[i]+".js");}catch(e){}
                    for(var i in objects)
                        try {fs.unlinkSync(m.cfg.path+"/server/app/middleware/"+file_path+"/"+objects[i]+".js");}catch(e){}
                }
                dfd.resolve({});
            });
            return dfd.promise;
        },
        "index": function(req,res){
            return m.model_names.map(function(a){
                return wrap_model(m.models[a]);
            });
        }
    }
};

module.exports = obj;