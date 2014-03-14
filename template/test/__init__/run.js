var tests = {};

var testPath = m.cfg.path+"/test/";

var testDirs = m.utils.fs.readdirSync(testPath);
for(var i in testDirs){
    var test = testDirs[i];
    if (/^_/.test(testDirs[i])) continue;
    var f = m.utils.fs.statSync(testPath+test);
    if (!f.isDirectory()) continue;
    tests[testDirs[i]] = {path: testPath+test};
    var files = m.utils.fs.readdirSync(testPath+test);
    tests[test].modules = files.filter(function(a){
        return /.js$/.test(a) && !/^\./.test(a) && !/^_/.test(a) ;
    });
}

describe('Run MUON complete test:',function(){
    before(function(done){
        m.ready(done);
    });

    for(var i in tests){
        describe("\n\n\t\t==================== "+i+" ====================\n\n",function(){
            tests[i].modules.forEach(function(a){
                if (/x\./.test(a)){
                    xdescribe("\n>>>>>>> "+a+":\n",function(){
                        require(tests[i].path+"/"+a);
                    })
                }
                else {
                    describe("\n>>>>>>> "+a+":\n",function(){
                        require(tests[i].path+"/"+a);
                    })
                }
            })
        });
    }
})