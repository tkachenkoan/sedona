// import gulp from 'gulp'
// import plumber from 'gulp-plumber';
// import sass from 'gulp-dart-sass';
// import postcss from 'gulp-postcss';
// import autoprefixer from 'autoprefixer';
// import browser from 'browser-sync';


// // Styles

// export const styles = () => {
//   return gulp.src('source/sass/style.scss', { sourcemaps: true })
//     .pipe(plumber())
//     .pipe(sass().on('error', sass.logError))
//     .pipe(postcss([
//       autoprefixer()
//     ]))
//     .pipe(gulp.dest('source/saas/style.css', { sourcemaps: '.' }))
//     .pipe(browser.stream());
// }

// // Server

// const server = (done) => {
//   browser.init({
//     server: {
//       baseDir: 'source'
//     },
//     cors: true,
//     notify: false,
//     ui: false,
//   });
//   done();
// }

// // Watcher

// const watcher = () => {
//   gulp.watch('source/sass/**/*.scss', gulp.series(styles));
//   gulp.watch('source/*.html').on('change', browser.reload);
// }


// export default gulp.series(
//   styles, server, watcher
// );
// TODO автозагрузка плагинов http://getinstance.info/articles/tools/include-plugins-with-gulp-load-plugins/
var gulp       = require('gulp'), // Подключаем Gulp

	sass         = require('gulp-sass'), //Подключаем Sass пакет,
	autoprefixer = require('gulp-autoprefixer'), // Библиотека для автоматического добавления префиксов
	cssnano      = require('gulp-cssnano'), // Подключаем пакет для минификации CSS
	rename       = require('gulp-rename'), // Подключаем библиотеку для переименования файлов
	uglify       = require('gulp-uglifyjs'), // Подключаем gulp-uglifyjs (для сжатия JS)
	// imagemin     = require('gulp-imagemin'), // Подключаем библиотеку для работы с изображениями
	htmlmin 	 = require('gulp-htmlmin'), // Библиотека минификации html
	inject 		 = require('gulp-inject'), // Библиотека вставки ссылок на css и js
	useref		 = require('gulp-useref'), // Библиотека конкатенации файлов-ссылок внутри html
	browserSync  = require('browser-sync'), // Подключаем Browser Sync
	del          = require('del'), // Подключаем библиотеку для удаления файлов и папок
	runSequence  = require('run-sequence'); // Библиотека выполнение скриптов в определенной последовательности

var dev = true;

var paths = {
	root: './',
 	src: 'app/',
	tmp: '.tmp/',
	nm: 'node_modules/',
 	dist: 'dist/'
}

gulp.task('styles', function() { // Создаем таск Sass styles // надо добавить gulp-inject
	return gulp.src([
			paths.src + 'styles/**/*.scss',
		]) // Берем источник
		.pipe(sass()) // Преобразуем Sass в CSS посредством gulp-sass
		.pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8', 'ie 7'], { cascade: true })) // Создаем префиксы
		.pipe(gulp.dest(paths.tmp + 'styles/')) // Выгружаем результата во временную папку /.tmp
		.pipe(browserSync.stream()); // Обновляем CSS на странице при изменении
});

gulp.task('scripts', function() {
	return gulp.src([ // Берем все необходимые библиотеки
			paths.src + 'scripts/**/*.js',
		])
		.pipe(gulp.dest(paths.tmp + 'scripts/')); // Выгружаем в папку tmp/js
});

gulp.task('images', function() {
	return gulp.src([ // Берем все необходимые изображения
			paths.nm + 'leaflet/dist/images/*.+(png|jpg|gif|svg)',
		])
		// .pipe(imagemin()) // еще не использую
		.pipe(gulp.dest(paths.tmp + 'styles/images/')); // Выгружаем в папку leaflet
});

gulp.task('inject', function () {
	var injectStyles = gulp.src([ // selects all css files from the .tmp dir
		paths.nm + 'bootstrap/dist/css/bootstrap.css',
		paths.nm + 'leaflet/dist/leaflet.css',
		paths.tmp + '/**/*.css'
		], { read: false }
	);

	var injectScripts = gulp.src([  // selects all js files from .tmp dir, но сейчас 24 марта мы еще не пишем в ES6
		paths.nm + 'jquery/dist/jquery.js', // Берем jQuery
		paths.nm + 'tether/dist/js/tether.js', // Берем tether.js
		paths.nm + 'bootstrap/dist/js/bootstrap.js', // Берем bootstrap js
		paths.nm + 'leaflet/dist/leaflet-src.js', // Берем leaflet
		paths.tmp + '/**/*.js',
		'!' + paths.src + '/**/*.test.js'
	]);

	return gulp.src(paths.src + '/*.html')
		.pipe(inject(injectStyles, { name: 'head', relative: true }))
		.pipe(inject(injectScripts, { relative: true }))
		.pipe(gulp.dest(paths.tmp))
		.pipe(browserSync.stream());
});

gulp.task('clean', function() {
	return del.sync([paths.dist, paths.tmp]); // Удаляем папку dist и .tmp
});

gulp.task('build', function() {
	runSequence('clean', ['styles', 'scripts', 'images'] ,'inject', function() {
		// Переносим стили и скрипты  в продакшен
		var buildSS = gulp.src(paths.tmp + '*.html') // Выбираем файл для минификации
			.pipe(useref())
	        .pipe(gulpif('*.js', uglify())) // минифицируем js
	        .pipe(gulpif('*.css', cssnano())) // // минифицируем css
			.pipe(gulp.dest(paths.dist)); // Выгружаем в папку dist

		// Переносим шрифты в продакшен
		var buildFonts = gulp.src(paths.src + 'fonts/**/*')
		.pipe(gulp.dest(paths.dist + 'fonts'))

		// Переносим изображения в продакшен
		var buildImages = gulp.src(paths.tmp + 'styles/**/*.+(png|jpg|gif|svg)')
		.pipe(gulp.dest(paths.dist + 'styles/'))

		// Переносим favicon
		var buildFavicon = gulp.src(paths.src + 'favicon.ico') // Переносим в продакшен
			.pipe(gulp.dest(paths.dist));

		// Минифицируем html
		var buildHtml = gulp.src(paths.tmp + '*.html') // Переносим HTML в продакшен
			.pipe(htmlmin({collapseWhitespace: true}))
			.pipe(gulp.dest(paths.dist));
	});
});

function browserSyncInit(base, files) {
	return browserSync.instance = browserSync.init(files, {
		startPath: paths.root, // опиция с какого фала начинать просмотр при старте  "/info.php"
		server: {
			baseDir: base
		},
		notify: false // Отключаем уведомления
	});
}

gulp.task('serve', function () {
	runSequence(['styles', 'scripts', 'images'] ,'inject', function() {
		bs = browserSyncInit([
			paths.tmp,					// serving files
			paths.root,					// для подключение node_modules
			paths.src 					// для favicon
		], [
										// watching files
		]);

	    gulp.watch(paths.src + 'styles/**/*.scss', ['styles']);	// watching scss
	    gulp.watch(paths.src + '*.html', ['inject']);	// watching html
	});
});

gulp.task('serve:dist', ['build'], function () {
	dev = false;
	browserSyncInit(paths.dist);
});

// gulp.task('watch', ['serve', 'css-min', 'scripts'], function() {
// 	gulp.watch(paths.src + 'styles/**/*.scss', ['scss']); // Наблюдение за sass файлами в папке styles
// 	gulp.watch(paths.src + '*.html', browserSync.reload); // Наблюдение за HTML файлами в корне проекта
// 	gulp.watch(paths.src + 'scripts/**/*.js', browserSync.reload);   // Наблюдение за JS файлами в папке js
// });

gulp.task('default', ['serve']);