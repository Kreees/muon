var loadPlugin = m.sys.require("/app/plugins/loadPlugin");

exports.common = function(cfg,scope){
    var dfd = m.utils.Q.defer();
    loadPlugin().then(function(scope){
        m.__plugins[""] = m.app;
        dfd.resolve();
    },dfd.reject).done();
    return dfd.promise;
}