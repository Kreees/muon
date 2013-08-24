module.exports = m.rest.extend({
    dependencies: [
        "user.user"
    ],
    permissions: function(){
        if (!this.user) return [];
        if (m.cfg.server_mode != "development" || m.wait_restart) return ["get"];
        return ["get","edit"];
    },
    actions: {}
});