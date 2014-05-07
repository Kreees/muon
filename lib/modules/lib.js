exports.models = {
//    defineModel: m.sys.require("models/models").defineModel,
//    assignController:
};

exports.controllers = {
    PlainController: m.sys.require("/app/controllers/controller"),
    ResourceController: m.sys.require("/app/controllers/node-orm2/resource")
}
