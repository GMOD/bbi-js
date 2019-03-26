[@gmod/bbi](../README.md) > ["localFile"](../modules/_localfile_.md)

# External module: "localFile"

## Index

### Classes

* [LocalFile](../classes/_localfile_.localfile.md)

### Variables

* [__webpack_require__](_localfile_.md#__webpack_require__)
* [fs](_localfile_.md#fs)
* [fsFStat](_localfile_.md#fsfstat)
* [fsOpen](_localfile_.md#fsopen)
* [fsRead](_localfile_.md#fsread)
* [fsReadFile](_localfile_.md#fsreadfile)

---

## Variables

<a id="__webpack_require__"></a>

###  __webpack_require__

**● __webpack_require__**: *`any`*

*Defined in [localFile.ts:2](https://github.com/gmod/bbi-js/blob/e20e58c/src/localFile.ts#L2)*

___
<a id="fs"></a>

### `<Const>` fs

**● fs**: *`any`* =  typeof __webpack_require__ !== 'function' ? require('fs') : null

*Defined in [localFile.ts:5](https://github.com/gmod/bbi-js/blob/e20e58c/src/localFile.ts#L5)*

___
<a id="fsfstat"></a>

### `<Const>` fsFStat

**● fsFStat**: *`any`* =  fs && promisify(fs.fstat)

*Defined in [localFile.ts:9](https://github.com/gmod/bbi-js/blob/e20e58c/src/localFile.ts#L9)*

___
<a id="fsopen"></a>

### `<Const>` fsOpen

**● fsOpen**: *`any`* =  fs && promisify(fs.open)

*Defined in [localFile.ts:7](https://github.com/gmod/bbi-js/blob/e20e58c/src/localFile.ts#L7)*

___
<a id="fsread"></a>

### `<Const>` fsRead

**● fsRead**: *`any`* =  fs && promisify(fs.read)

*Defined in [localFile.ts:8](https://github.com/gmod/bbi-js/blob/e20e58c/src/localFile.ts#L8)*

___
<a id="fsreadfile"></a>

### `<Const>` fsReadFile

**● fsReadFile**: *`any`* =  fs && promisify(fs.readFile)

*Defined in [localFile.ts:10](https://github.com/gmod/bbi-js/blob/e20e58c/src/localFile.ts#L10)*

___

