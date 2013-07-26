module.exports = {
    dependencies: ["user.session"],
    decorator: ["nick"],
    actions: {
       get: function(){ return this.user || null; }
    }
}