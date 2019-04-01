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
