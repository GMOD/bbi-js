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

* path - path to a local file 
* url - path to a url
* filehandle - a filehandle instance that you can implement as a custom class yourself. path and url are based on https://www.npmjs.com/package/filehandle but by implementing a class containing the Filehandle interface specified therein, you can pass it to this module


### BigWig

#### getFeatures(refName, start, end, opts)

* refName - a name of a chromosome in the file
* start - a 0-based half open start coordinate
* end - a 0-based half open end coordinate
* opts.scale - 1 is the maximum zoom level, fractional values indicate accessing different zoom levels based on pixelsPerBp
* opts.signal - an AbortSignal to halt processing
* opts.basesPerScale - optional, specified in bpPerPx 

Returns a promise to an array of features.

Example:

    const feats = await bigwig.getFeatures('chr1', 0, 100)
    // returns array of features with start, end, score
    // coordinates on returned data are are 0-based half open
    // no conversion to 1-based as in wig is done)
    // note refseq is not returned on the object, it is clearly chr1 from the query though
    

#### getFeatureStream(refName, start, end, opts)

Same getFeatures but returns an RxJS observable stream, useful for very large queries

    const observer = await bigwig.getFeatureStream('chr1', 0, 100)
    observer.subscribe(chunk => { /* chunk contains array of features with start, end, score */ }, errorCallback, finishCallback)

### BigBed

#### getFeatures(refName, start, end, opts)

* refName - a name of a chromosome in the file
* start - a 0-based half open start coordinate
* end - a 0-based half open end coordinate
* opts.signal - an AbortSignal to halt processing

returns a promise to an array of features. no concept of zoom levels is used with bigwig data

### getFeatureStream(refName, start, end, opts)

Same as above, but like the bigwig getFeatureForStream

#### note about BigBed file processing

The BigBed line contents are returned as a raw text line e.g. {start: 0, end:100, rest: "ENST00000456328.2\t1000\t..."} where "rest" contains tab delimited text for the fields from 4 and on in the BED format.  The rest line can be parsed by the @gmod/bed module, which is not by integrated with this module, but can be combined with it as follows


```js
    import {BigBed} from '@gmod/bed'
    import BED from '@gmod/bed'

    const ti = new BigBed({
      filehandle: new LocalFile(require.resolve('./data/hg18.bb')),
    })
    const {autoSql} = await ti.getHeader()
    const feats = await ti.getFeatures('chr7', 0, 100000)
    const parser = new BED({autoSql})
    const lines = feats.map(f => parser.parseBedText('chr7', f.start, f.end, f.rest, 3)) // 3 indicates skipping first 3 columns of the autoSql since these are provided by BigBed
    
```

Example output, coordinates are 0-based half open as in BED

```
        { refID: 'chr7',
          start: 75460,
          end: 116489,
          name: 'uc003sin.1',
          score: 0,
          strand: -1,
          thick_start: 75460,
          thick_end: 75460,
          reserved: '255,0,0',
          sp_id: 'AL137655' } ]
```

## Documentation

See [docs](docs/README.md)

## Academic Use

This package was written with funding from the [NHGRI](http://genome.gov) as part of the [JBrowse](http://jbrowse.org) project. If you use it in an academic project that you publish, please cite the most recent JBrowse paper, which will be linked from [jbrowse.org](http://jbrowse.org).

## License

MIT © [Colin Diesh](https://github.com/cmdcolin)

