module.exports = function(grunt) {
  grunt.initConfig({
      mocha_phantomjs:{
        all:{
            options:{
                urls:[
                    'http://localhost:8000'
                ]
            }
        }
    }
  });
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.registerTask('default',['mocha_phantomjs']);
}