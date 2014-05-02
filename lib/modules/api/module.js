module.exports = function(self,deps){
    var apiProc = self.require('lib/run');
    return {
        run: function(req,res){
            try{ apiProc(req,res) }
            catch(e){
                deps.logger.error(e);
                res.writeHead(500,{'content-type':'text/plain; charset=utf-8'});
                res.end(e.stack);
            }
        }
    }
}