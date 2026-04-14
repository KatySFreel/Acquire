import { series } from 'gulp';
import imagemin, { gifsicle, mozjpeg, optipng, svgo } from 'gulp-imagemin';
import webp from 'gulp-webp';
import avif from 'gulp-avif';

const copyRasterImages = () => {
    return app.gulp.src([
        `${app.paths.srcImgFolder}/**/*.{jpg,jpeg,png,gif}`,
        `!${app.paths.srcImgFolder}/favicon/**`,
    ], {
        base: app.paths.srcImgFolder,
        encoding: false,
    })
        .pipe(imagemin([
            gifsicle({ interlaced: true }),
            mozjpeg({ quality: 75, progressive: true }),
            optipng({ optimizationLevel: 2 }),
        ]))
        .pipe(app.gulp.dest(app.paths.buildImgFolder));
};

const copySvgImages = () => {
    return app.gulp.src([
        `${app.paths.srcImgFolder}/**/*.svg`,
        `!${app.paths.srcImgFolder}/svg/sprite.svg`,
        `!${app.paths.srcImgFolder}/favicon/**`,
    ], {
        base: app.paths.srcImgFolder,
        encoding: false,
    })
        .pipe(imagemin([
            svgo({
                plugins: [
                    {
                        name: 'preset-default',
                        params: {
                            overrides: {
                                removeViewBox: false,
                            },
                        },
                    },
                ],
            }),
        ]))
        .pipe(app.gulp.dest(app.paths.buildImgFolder));
};

const copySprite = () => {
    return app.gulp.src(`${app.paths.srcImgFolder}/svg/sprite.svg`, {
        base: app.paths.srcImgFolder,
        encoding: false,
    })
        .pipe(app.gulp.dest(app.paths.buildImgFolder));
};

const copyFavicons = () => {
    return app.gulp.src(`${app.paths.srcImgFolder}/favicon/**`, {
        base: app.paths.srcImgFolder,
        encoding: false,
    })
        .pipe(app.gulp.dest(app.paths.buildImgFolder));
};

const createWebp = () => {
    return app.gulp.src([
        `${app.paths.srcImgFolder}/**/*.{jpg,jpeg,png}`,
        `!${app.paths.srcImgFolder}/favicon/**`,
    ], {
        base: app.paths.srcImgFolder,
        encoding: false,
    })
        .pipe(webp({ quality: 75 }))
        .pipe(app.gulp.dest(app.paths.buildImgFolder));
};

const createAvif = () => {
    return app.gulp.src([
        `${app.paths.srcImgFolder}/**/*.{jpg,jpeg,png}`,
        `!${app.paths.srcImgFolder}/favicon/**`,
    ], {
        base: app.paths.srcImgFolder,
        encoding: false,
    })
        .pipe(avif({ quality: 50 }))
        .pipe(app.gulp.dest(app.paths.buildImgFolder));
};

export const images = series(
    copyRasterImages,
    copySvgImages,
    copySprite,
    copyFavicons,
    createWebp,
    createAvif
);