/*global module:false*/

module.exports = function(grunt) {
  //MODIFIED BY Castle-IT
  grunt.initConfig({
    pkg: grunt.file.readJSON('jquery.spellchecker.json'),
    meta: {
      banner: '/*\n * <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '<%= pkg.homepage ? " * " + pkg.homepage + "\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>\n */'
    },
    concat: {
      options: {
        stripBanners: true,
        banner: '/*\\n * <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\\n' +
        '<%= pkg.homepage ? " * " + pkg.homepage + "\\n" : "" %>' +
        ' * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
        ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>\\n */'
      },
      dist: {
        src: ['src/js/jquery.spellchecker.js'],
        dest: 'dist/js/<%= pkg.name %>.js'
      }
    },
    copy: {
      dist: {
        files: [
          { expand: true,  dest: "dist/examples/", cwd: "src/examples/", src: ['**'] },
          { expand: true,  dest: "dist/css/", cwd: "src/css/", src: ['**'] },
          { expand: true,  dest: "dist/webservices/php/", cwd: "src/webservices/php/", src: ['**'] },
          { expand: true,  dest: "dist/js/libs/jquery/", cwd: "src/js/libs/jquery/", src: ['jquery-1.8.2.min.js'] }
        ]
      }
    },
    min: {
      dist: 
        {
          src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
          dest: 'dist/js/<%= pkg.name %>.min.js'
        }
    },
    cssmin: {
      compress: {
        files: {
          "dist/css/jquery.spellchecker.min.css": ["src/css/jquery.spellchecker.css"]
        }
      }
    },
    compress: {
      options: {
        archive: 'archive/jquery.spellchecker-<%= pkg.version %>.zip'
      },
      zip: {
        files: [
          { expand: true,  dest: "", cwd: "dist/", src: ['**'] }

        ]
      }
    },
    jasmine : {
      pivotal: {
        src: 'src/**/*.js',
        options: {
          specs: 'tests/javascript/spec/**/*.js'
        }
      }

    },
    lint: {
      files: ['gruntfile.js', 'src/js/jquery.spellchecker.js', 'tests/javascript/**/*.js']
    },
    jshint: {
      files: ['gruntfile.js', 'src/js/jquery.spellchecker.js', 'tests/javascript/**/*.js'],
      options: {
        curly: false,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        browser: true,
        devel: true,
        globals: {
          jQuery: false,
          $: false,
          alert: false
        }
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %> */'
      },
      dist: {
        files: {
          'dist/js/<%= pkg.name %>.min.js': ['dist/js/<%= pkg.name %>.js']
        }
      }
    },
    clean: ["dist/" ]
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', [ 'jshint', 'clean' , 'concat','cssmin', 'uglify', 'copy', 'compress']);

  grunt.registerTask('test', [ 'jasmine']);
};
