- Improve documentation for integration with @gmod/bed@2

## [1.0.13](https://github.com/GMOD/bbi-js/compare/v1.0.12...v1.0.13) (2019-04-14)



- Added uniqueId to objects returned from BigBed to avoid issue with duplicates

## [1.0.12](https://github.com/GMOD/bbi-js/compare/v1.0.11...v1.0.12) (2019-04-12)

- Fix returning bigbed objects on empty regions


## [1.0.11](https://github.com/GMOD/bbi-js/compare/v1.0.10...v1.0.11) (2019-04-10)



- Removed polyfill of Array.prototype.flat which modifies global scope

## [1.0.10](https://github.com/GMOD/bbi-js/compare/v1.0.9...v1.0.10) (2019-04-09)



- Fix misinterpretation of variable step wig files in this module (the span is not variable in variable step files, only the step, use bedGraphToBigWig for variable span)
- Improved docs

## [1.0.9](https://github.com/GMOD/bbi-js/compare/v1.0.8...v1.0.9) (2019-04-05)



- Added caching of networking requests (thanks @rbuels for the abortable-promise-cache module!)
- Fix some type errors on the range class
- Correct using span on fixed size wiggle types

## [1.0.8](https://github.com/GMOD/bbi-js/compare/v1.0.7...v1.0.8) (2019-04-01)



- Fix @babel/runtime in deployed package
- Bugfix to the url argument to the BigWig/BigBed

## [1.0.7](https://github.com/GMOD/bbi-js/compare/v1.0.6...v1.0.7) (2019-04-01)



- Added getFeatureStream which returns an Observable from rxjs
- Added url option to BigWig and BigBed constructors to allow usage of RemoteFile filehandle
- Added typescript backend for better processing

## [1.0.6](https://github.com/GMOD/bbi-js/compare/v1.0.5...v1.0.6) (2019-03-15)



- Fix issue with fixed step and variable step bigwig files not working at all

## [1.0.5](https://github.com/GMOD/bbi-js/compare/v1.0.4...v1.0.5) (2019-03-07)



- Fix issue with jest being in deps instead of devDeps

## [1.0.4](https://github.com/GMOD/bbi-js/compare/v1.0.3...v1.0.4) (2019-01-28)



- Add renameRefSeqs functionality where you can apply a callback to the refseq names
- Consistently apply start/end coordinate filters at different zoom levels

## [1.0.3](https://github.com/GMOD/bbi-js/compare/v1.0.2...v1.0.3) (2019-01-27)

- Fix issue with properly inflating chunks (issue #1)

## [1.0.2](https://github.com/GMOD/bbi-js/compare/v1.0.1...v1.0.2) (2019-01-24)



- Added regenerator-runtime to babel dist compilation

## [1.0.1](https://github.com/GMOD/bbi-js/compare/v1.0.0...v1.0.1) (2019-01-24)



- Added exports for BigWig and BigBed. const {BigWig, BigBed} = require('@gmod/bbi')

# 1.0.0 (2019-01-23)



- Initial version
- Has support for bigwig and bigbed files
