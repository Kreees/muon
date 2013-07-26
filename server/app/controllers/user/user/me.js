module.exports = {
    dependencies: ["user.session"],
    decorator: ["nick","email","roles"],
    actions: {
       get: function(){ return this.user || null; }
    }
}