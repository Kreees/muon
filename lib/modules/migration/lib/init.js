module.exports = function(self,deps){
    var g = require('grunt');
    var State = self.require('lib/migrationState');

    return function(path){
        var dir = path + '/migrations/';
        var dbPath = dir + "history.db";
        var mjcDir = dir + 'magic/';
        
        if (!g.file.exists(dir))
            g.file.mkdir(dir);
        if (!g.file.exists(mjcDir))
            g.file.mkdir(mjcDir);
        if (!g.file.exists(dbPath))
            g.file.write(dbPath, "");
            
        return State.init("sqlite://"+dbPath, mjcDir);
    };
};
