module.exports = function(grunt) {
  var mu = require('./module.js');
  var prjPath = '/home/neila/Aptana/back/';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat:{
        client:{
            options: {
              stripBanners: true,
              banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %> */ \n\n (function(){\n',
              footer: (function(){
                          return "__domain__ = '"+ (m.cfg.domain || m.cfg.host +":"+ m.cfg.port)+"',"+
                                  "__serverMode__ = '"+m.cfg.serverMode+"',"+
                                  "__protocol__ = '"+ m.cfg.protocol +"';"+
                                  "\n})();\n\n";
                      }).call(), 
            },
            files: {
              'tmp/grunt/concatmuon.js': ['lib/client/muonjs/*.js'],
            }
        }
    },
    uglify:{
        client: {
            src: 'tmp/grunt/concatmuon.js',
            dest: prjPath+'client/assets/muon.js'
          }
    },
    watch:{
        reload:{
            options:{livereload:true},
            files:['lib/client/muonjs/*js'],
            tasks:[]
        }
    },
    clean:{
        client:['tmp/grunt'],
    },
    
    
    mocha_phantomjs:{
        all:{
            options:{
                urls:[
                    'http://localhost:8000'
                ]
            }
        }
    },
    jade:{
        test:{
            options:{
                debug: true
            },
            files:{
                'tmp/lolo.html': prjPath+'client/packages/application/views/model/subject/subject.jade'
            }  
        }
    }
  });
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-shell');
  grunt.registerTask('default',['mocha_phantomjs']);
  grunt.registerTask('testing',['mocha_phantomjs']);
  grunt.registerTask('client_render',['concat:client','uglify:client','clean:client']);
  grunt.registerTask('db','create dbs and tables with mysql',function(){
    var orm = m.utils.orm;
    var db = m.databases.default;
    var Sync = require('sql-ddl-sync');
    module.app.models;
    if (!db) throw 'Grunt error with db';
    var sync = new Sync({
        dialect : "mysql",
        driver  : db.driver,
        debug   : function (text) {
            console.log("> %s", text);
        }
    });
    
    sync.defineCollection("ddl_sync_test", {
        id     : { type : "number", primary: true, serial: true },
        name   : { type : "text", required: true },
        age    : { type : "number", rational: true },
        male   : { type : "boolean" },
        born   : { type : "date", time: true },
        born2  : { type : "date" },
        int2   : { type : "number", size: 2 },
        int4   : { type : "number", size: 4 },
        int8   : { type : "number", size: 8 },
        float4 : { type : "number", rational: true, size: 4 },
        float8 : { type : "number", rational: true, size: 8 },
        type   : { type : "enum", values: [ 'dog', 'cat'], defaultValue: 'dog', required: true },
        photo  : { type : "binary" }
    });
    
    sync.sync(function (err) {
        if (err) {
            console.log("> Sync Error");
            console.log(err);
        } else {
            console.log("> Sync Done");
        }
        process.exit(0);
    });
  })
  // console.log(m.sys.path);
}