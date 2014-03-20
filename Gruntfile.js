module.exports = function(grunt) {
  var mu = require('./module.js');
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    mocha_phantomjs:{
        all:{
            options:{
                urls:[
                    'http://localhost:8000'
                ]
            }
        }
    },
    concat:{
        options: {
          stripBanners: true,
          banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
            '<%= grunt.template.today("yyyy-mm-dd") %> */ \n\n (function(){\n',
          footer: '\n})();\n\n', 
        },
        dist: {
            src: ['lib/client/muonjs/*.js'],
            dest: 'client/assets/concatmuon.js'
          }
    },
    uglify:{
        dist: {
            src: 'client/assets/concatmuon.js',
            dest: 'client/assets/muon.js'
          }
    },
    watch:{
        reload:{
            options:{livereload:true},
            files:['lib/client/muonjs/*js'],
            tasks:[]
        }
    }
  });
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-shell');
  grunt.registerTask('default',['mocha_phantomjs']);
  grunt.registerTask('client_mrender',['concat', 'addinfo','uglify']);
  // console.log(mu.server.compileMuonJs());
}