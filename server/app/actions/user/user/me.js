module.exports = {
    dependencies: ["user.session"],
    decorator: ["nick","email","roles"],
    permissions: function(){
        return ["get"];
    },
    actions: {
       get: function(){
           return this.user || null;
       }
    }
}