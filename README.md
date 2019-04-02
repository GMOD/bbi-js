# bbi-js

[![NPM version](https://img.shields.io/npm/v/@gmod/bbi.svg?style=flat-square)](https://npmjs.org/package/@gmod/bbi)
[![Build Status](https://img.shields.io/travis/GMOD/bbi-js/master.svg?style=flat-square)](https://travis-ci.org/GMOD/bbi-js) [![Coverage Status](https://img.shields.io/codecov/c/github/GMOD/bbi-js/master.svg?style=flat-square)](https://codecov.io/gh/GMOD/bbi-js/branch/master)


A parser for bigwig and bigbed file formats

## Usage

If using locally

    import {BigWig} from '@gmod/bbi'
    const ti = new BigWig({
      path: 'volvox.bw'
    })
    await ti.getHeader()
    const feats = await ti.getFeatures('chr1', 0, 100, { scale: 1 })


## Documentation

### BigWig/BigBed constructors

Accepts an object containing either

a) path - uses the LocalFile class in this repo
b) url - uses the RemoteFile class in this repo
c) filehandle - accepts some custom file handle class that you provide


### BigWig

#### getFeatures(refName, start, end, opts)

opts.scale - 1 is the maximum zoom level, fractional values indicate a accessing multiple zoom levels based on pixelsPerBp
opts.signal - an AbortSignal to halt processing
opts.basesPerScale - inverse of opts.scale

returns a promise to an array of features

#### getFeatureStream(refName, start, end, opts)

Same as obove but returns an RxJS observable stream

### BigBed

#### getFeatures(refName, start, end, opts)

opts.signal - an AbortSignal to halt processing

returns a promise to an array of features

#### note about BigBed file processing

The BigBed line contents can be parsed by @gmod/bed, it is not integrated with this module by default but for example

```js
    import {BigBed} from '@gmod/bed'
    import BED from '@gmod/bed'

    const ti = new BigBed({
      filehandle: new LocalFile(require.resolve('./data/hg18.bb')),
    })
    const {autoSql} = await ti.getHeader()
    const feats = await ti.getFeatures('chr7', 0, 100000)
    const parser = new BED({autoSql})
    const lines = feats.map(f => parser.parseBedText('chr7', f.start, f.end, f.rest))
    // outputs
      { refID: 'chr7',
        start: 65159,
        end: 65220,
        chrom: 'uc003sim.1',
        chrom_start: 0,
        chrom_end: '-',
        name: '65159',
        score: 65159,
        strand: 0,
        thick_end: 'DQ600587' },
```

## Documentation

See [docs](docs/README.md)

## Academic Use

This package was written with funding from the [NHGRI](http://genome.gov) as part of the [JBrowse](http://jbrowse.org) project. If you use it in an academic project that you publish, please cite the most recent JBrowse paper, which will be linked from [jbrowse.org](http://jbrowse.org).

## License

MIT © [Colin Diesh](https://github.com/cmdcolin)

