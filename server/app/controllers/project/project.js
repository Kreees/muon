module.exports = m.ResourceController.extend({
    dependencies: [
        "user.user"
    ],
    permissions: function(){
        if (!this.user) return [];
        if (m.cfg.serverMode != "development" || m.waitRestart) return ["get"];
        return ["get","edit"];
    },
    actions: {}
});