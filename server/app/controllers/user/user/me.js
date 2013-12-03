module.exports = {
    dependencies: ["user.session"],
    decorator: ["nick","email","roles"],
    permissions: function(){
        m.log("here");
        return ["get"];
    },
    actions: {
       get: function(){
           m.log(this.user);
           return this.user || null;
       }
    }
}