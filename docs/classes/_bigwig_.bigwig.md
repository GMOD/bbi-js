[@gmod/bbi](../README.md) > ["bigwig"](../modules/_bigwig_.md) > [BigWig](../classes/_bigwig_.bigwig.md)

# Class: BigWig

## Hierarchy

 [BBIFile](_bbi_.bbifile.md)

**↳ BigWig**

## Index

### Constructors

* [constructor](_bigwig_.bigwig.md#constructor)

### Properties

* [featureCache](_bigwig_.bigwig.md#featurecache)
* [getHeader](_bigwig_.bigwig.md#getheader)
* [renameRefSeqs](_bigwig_.bigwig.md#renamerefseqs)

### Methods

* [getFeatureStream](_bigwig_.bigwig.md#getfeaturestream)
* [getFeatures](_bigwig_.bigwig.md#getfeatures)
* [getView](_bigwig_.bigwig.md#getview)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BigWig**(options: *[Options](../interfaces/_bbi_.options.md)*): [BigWig](_bigwig_.bigwig.md)

*Inherited from [BBIFile](_bbi_.bbifile.md).[constructor](_bbi_.bbifile.md#constructor)*

*Defined in [bbi.ts:77](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L77)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| options | [Options](../interfaces/_bbi_.options.md) |

**Returns:** [BigWig](_bigwig_.bigwig.md)

___

## Properties

<a id="featurecache"></a>

### `<Protected>` featureCache

**● featureCache**: *`LRU`<`any`, `any`>*

*Inherited from [BBIFile](_bbi_.bbifile.md).[featureCache](_bbi_.bbifile.md#featurecache)*

*Defined in [bbi.ts:75](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L75)*

___
<a id="getheader"></a>

###  getHeader

**● getHeader**: *`function`*

*Inherited from [BBIFile](_bbi_.bbifile.md).[getHeader](_bbi_.bbifile.md#getheader)*

*Defined in [bbi.ts:77](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L77)*

#### Type declaration
▸(abortSignal?: *`AbortSignal`*): `Promise`<`any`>

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<`any`>

___
<a id="renamerefseqs"></a>

### `<Protected>` renameRefSeqs

**● renameRefSeqs**: *`function`*

*Inherited from [BBIFile](_bbi_.bbifile.md).[renameRefSeqs](_bbi_.bbifile.md#renamerefseqs)*

*Defined in [bbi.ts:76](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L76)*

#### Type declaration
▸(a: *`string`*): `string`

**Parameters:**

| Name | Type |
| ------ | ------ |
| a | `string` |

**Returns:** `string`

___

## Methods

<a id="getfeaturestream"></a>

###  getFeatureStream

▸ **getFeatureStream**(refName: *`string`*, start: *`number`*, end: *`number`*, opts?: *[Options](../interfaces/_bigwig_.options.md)*): `Promise`<`Observable`<[Feature](../interfaces/_feature_.feature.md)[]>>

*Defined in [bigwig.ts:20](https://github.com/gmod/bbi-js/blob/27f8971/src/bigwig.ts#L20)*

Gets features from a BigWig file

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| refName | `string` | - |  The chromosome name |
| start | `number` | - |  The start of a region |
| end | `number` | - |  The end of a region |
| `Default value` opts | [Options](../interfaces/_bigwig_.options.md) |  { scale: 1 } |  An object containing basesPerSpan (e.g. pixels per basepair) or scale used to infer the zoomLevel to use |

**Returns:** `Promise`<`Observable`<[Feature](../interfaces/_feature_.feature.md)[]>>

___
<a id="getfeatures"></a>

###  getFeatures

▸ **getFeatures**(refName: *`string`*, start: *`number`*, end: *`number`*, opts?: *[Options](../interfaces/_bigwig_.options.md)*): `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

*Defined in [bigwig.ts:46](https://github.com/gmod/bbi-js/blob/27f8971/src/bigwig.ts#L46)*

**Parameters:**

| Name | Type | Default value |
| ------ | ------ | ------ |
| refName | `string` | - |
| start | `number` | - |
| end | `number` | - |
| `Default value` opts | [Options](../interfaces/_bigwig_.options.md) |  { scale: 1 } |

**Returns:** `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

___
<a id="getview"></a>

### `<Protected>` getView

▸ **getView**(scale: *`number`*, abortSignal?: *`AbortSignal`*): `Promise`<[BlockView](_blockview_.blockview.md)>

*Inherited from [BBIFile](_bbi_.bbifile.md).[getView](_bbi_.bbifile.md#getview)*

*Defined in [bbi.ts:305](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L305)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| scale | `number` |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<[BlockView](_blockview_.blockview.md)>

___

