const browserSync = require('browser-sync').create();
var path        = require('path');
var child       = require('child_process');
var gulp        = require('gulp');
var gutil       = require('gulp-util');
var clean       = require('gulp-clean');
var sequence    = require('run-sequence');
var concat      = require('gulp-concat');
var cache       = require('gulp-cache');
var sass        = require('gulp-sass');
var prefix      = require('gulp-autoprefixer');
var minifyCSS   = require('gulp-csso');
var imageMin    = require('gulp-imagemin')
var uglify      = require('gulp-uglify');

var siteRoot    = path.resolve('./_site');
var dest        = path.resolve('./assets/');

var jekyll      = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';
var messages    = {
  jekyllBuild: '<span style="color: grey">Running:</span> $ jekyll build',
  jekyllServe: '<span style="color: grey">Running:</span> $ jekyll serve'
};

// Build the Jekyll site
gulp.task('jekyll-serve', ['process'], function (done) {
  browserSync.notify(messages.jekyllServe);
  const jekyll = child.spawn( 'jekyll' , ['serve',
    '--watch',
    '--incremental',
    '--drafts',
    '--config=_config.yml,_config_dev.yml'
  ]);

  const jekyllLogger = (buffer) => {
    buffer.toString()
      .split(/\n/)
      .forEach((message) => gutil.log('Jekyll: ' + message));
  };

  jekyll.stdout.on('data', jekyllLogger);
  jekyll.stderr.on('data', jekyllLogger);

  return jekyll;
});

// Production build the Jekyll site
gulp.task('jekyll-build', ['process'], () => {
  browserSync.notify(messages.jekyllBuild);
  const jekyll = child.spawn('jekyll', ['build',
    '--config=_config.yml,_config_prod.yml',
  ]);

  const jekyllLogger = (buffer) => {
    buffer.toString()
      .split(/\n/)
      .forEach((message) => gutil.log('Jekyll: ' + message));
  };

  jekyll.stdout.on('data', jekyllLogger);
  jekyll.stderr.on('data', jekyllLogger);

  return jekyll;
});

// Rebuild Jekyll & do page reload
gulp.task('jekyll-rebuild', ['jekyll-serve'], function () {
  browserSync.reload();
});

// Wait for jekyll-build, then launch the Server
gulp.task('browser-sync', function() {
  browserSync.init({
    files: [siteRoot + '/**'],
    port: 4000,
    server: {
      baseDir: siteRoot
    }
  });
});

// Copy vendor styles from npm
gulp.task('vendor', function() {
  return gulp.src('node_modules/tachyons/css/tachyons.min.css')
    .pipe(gulp.dest('src/sass/vendor'))
});

// Compile _scss from src/scss/
gulp.task('sass', ['vendor'], function () {
  return gulp.src('src/sass/**/*.scss')
    .pipe(sass({
      includePaths: ['scss'],
      onError: browserSync.notify
    }))
    .pipe(prefix(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true }))
    .pipe(minifyCSS())
    .pipe(gulp.dest(dest + '/css'))
    .pipe(browserSync.reload({stream:true}))
});

// Minify and concatenate js from /src/js/
gulp.task('js', function() {
  gulp.src('src/js/vendor/**/*.js')
    .pipe(gulp.dest(dest + '/js'));

  gulp.src(['src/js/**', '!src/js/vendor{,/**/*}'])
    .pipe(uglify())
    .pipe(concat('screen.min.js'))
    .pipe(gulp.dest(dest + '/js'))
    .pipe(browserSync.reload({stream:true}));
});

// Compress and move images from src/img/
gulp.task('images', function() {
  return gulp.src('./src/img/**/*.+(png|jpg|jpeg|gif|svg)')
    .pipe(cache(imageMin()))
    .pipe(gulp.dest(dest + '/img/'))
    .pipe(browserSync.reload({stream:true}))
});

// Watch for changes & recompile
gulp.task('watch', function () {
  gulp.watch('./src/sass/**/*.scss', ['sass']);
  gulp.watch(['src/js/**/*.js'], ['js']);
  gulp.watch('./src/img/**/*.+(png|jpg|jpeg|gif|svg)', ['images']);
  gulp.watch(['*.html', '_layouts/**/*.html', '_includes/**/*.html', '_posts/**/*'], ['jekyll-rebuild']);
});

gulp.task('clean', function() {
  gulp.src(dest)
    .pipe(clean({force: true}))
});

gulp.task('process', [ 'sass', 'js', 'images' ]);

gulp.task('build', function(cb) {
  sequence('clean', 'jekyll-build', cb);
});

gulp.task('default', [ 'jekyll-serve', 'browser-sync', 'watch' ]);
