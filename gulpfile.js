var jshint  = require('gulp-jshint');
var stylish = require('jshint-stylish');
var gulp    = require('gulp');

// Code quality check by linting the source-files
gulp.task('lint', function() {
    return gulp.src([
        './bin/www',
        './models/**/*.js',
        './routes/**/*.js',
        './util/**/*.js',
        './test/**/*.js',
        './index.js'
    ]).pipe(jshint())
      .pipe(jshint.reporter(stylish));
});