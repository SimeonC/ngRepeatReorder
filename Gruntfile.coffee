module.exports = (grunt) ->
	
	# load all grunt tasks
	grunt.loadNpmTasks 'grunt-contrib-jshint'
	grunt.loadNpmTasks 'grunt-contrib-clean'
	grunt.loadNpmTasks 'grunt-contrib-coffee'
	grunt.loadNpmTasks 'grunt-contrib-watch'
	grunt.loadNpmTasks 'grunt-istanbul-coverage'
	grunt.loadNpmTasks 'grunt-karma'
	
	# Default task.
	grunt.registerTask 'default', ['coffee','test']
	grunt.registerTask 'test', ['clean', 'karma', 'coverage']
	
	testConfig = (configFile, customOptions) ->
		options = 
			configFile: configFile
			keepalive: true
		travisOptions = process.env.TRAVIS && { browsers: ['Chrome'], reporters: 'dots' }
		grunt.util._.extend options, customOptions, travisOptions
	
	# Project configuration.
	grunt.initConfig
		clean: ["coverage/*.json"]
		coverage:
			options:
				thresholds:
					'statements': 97.5
					'branches': 96
					'lines': 97.5
					'functions': 95
			dir: 'coverage'
			root: ''
		karma:
			unit:
				options: testConfig 'karma.conf.coffee'
		coffee:
			compile:
				files:
					'dist/ngRepeatReorder.js': 'src/ngRepeatReorder.coffee'
		watch:
			all:
				files: ['src/*']
				tasks: ['coffee']