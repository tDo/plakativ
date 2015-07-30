var path           = require('path');
var jshint         = require('gulp-jshint');
var stylish        = require('jshint-stylish');
var less           = require('gulp-less');
var lessAutoPrefix = require('less-plugin-autoprefix');
var minifyCSS      = require('gulp-minify-css');
var gulp           = require('gulp');


// Less-conversion task
gulp.task('less', function() {
    var autoprefix = new lessAutoPrefix({ browsers: ['last 2 versions'] });

    return gulp.src('./client/styles/less/**/*.less')
        .pipe(less({
            plugins: [ autoprefix ],
            paths:   [ path.join(__dirname, 'client', 'styles', 'less', 'includes') ]
        }))
        .pipe(minifyCSS())
        .pipe(gulp.dest('./client/styles/css'));
});

// Code quality check by linting the source-files
gulp.task('lint', function() {
    return gulp.src([
        './bin/www',
        './server/**/*.js',
        './test/**/*.js',
        './index.js'
    ]).pipe(jshint())
      .pipe(jshint.reporter(stylish));
});