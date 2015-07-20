var path      = require('path');
var jshint    = require('gulp-jshint');
var stylish   = require('jshint-stylish');
var less      = require('gulp-less');
var minifyCSS = require('gulp-minify-css');
var gulp      = require('gulp');


// Less-conversion task
gulp.task('less', function() {
    return gulp.src('./less/**/*.less')
        .pipe(less({
            paths: [ path.join(__dirname, 'less', 'includes') ]
        }))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./public/css'));
});

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