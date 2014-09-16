module.exports = function(self,deps){
    
    var g = require('grunt');
    var cfg = deps.config.load();
    var dir = cfg.path + '/migrations/';
    var dbPath = dir + "history.db";
    var mjcDir = dir + 'magic/';
    
    return function(){
        if (!g.file.exists(dir))
            g.file.mkdir(dir);
        if (!g.file.exists(mjcDir))
            g.file.mkdir(mjcDir);
        if (!g.file.exists(dbPath))
            g.file.write(dbPath, "");
        var prms = self.require('lib/migrationState').init("sqlite://"+dbPath, mjcDir).then(function(State) {
            self.MState = State;
            self.mjcDir = mjcDir;
        }); 
        return prms;
    };
};
