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
  // console.log(m.sys.path);
}