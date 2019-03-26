[@gmod/bbi](../README.md) > ["bigwig"](../modules/_bigwig_.md) > [BigWig](../classes/_bigwig_.bigwig.md)

# Class: BigWig

## Hierarchy

 [BBIFile](_bbi_.bbifile.md)

**↳ BigWig**

## Index

### Constructors

* [constructor](_bigwig_.bigwig.md#constructor)

### Properties

* [renameRefSeqs](_bigwig_.bigwig.md#renamerefseqs)

### Methods

* [getFeatures](_bigwig_.bigwig.md#getfeatures)
* [getHeader](_bigwig_.bigwig.md#getheader)
* [getView](_bigwig_.bigwig.md#getview)
* [initData](_bigwig_.bigwig.md#initdata)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BigWig**(options: *[Options](../interfaces/_bbi_.options.md)*): [BigWig](_bigwig_.bigwig.md)

*Inherited from [BBIFile](_bbi_.bbifile.md).[constructor](_bbi_.bbifile.md#constructor)*

*Defined in [bbi.ts:42](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L42)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| options | [Options](../interfaces/_bbi_.options.md) |

**Returns:** [BigWig](_bigwig_.bigwig.md)

___

## Properties

<a id="renamerefseqs"></a>

###  renameRefSeqs

**● renameRefSeqs**: *`function`*

*Inherited from [BBIFile](_bbi_.bbifile.md).[renameRefSeqs](_bbi_.bbifile.md#renamerefseqs)*

*Defined in [bbi.ts:42](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L42)*

#### Type declaration
▸(a: *`string`*): `string`

**Parameters:**

| Name | Type |
| ------ | ------ |
| a | `string` |

**Returns:** `string`

___

## Methods

<a id="getfeatures"></a>

###  getFeatures

▸ **getFeatures**(refName: *`string`*, start: *`number`*, end: *`number`*, opts?: *[Options](../interfaces/_bigwig_.options.md)*): `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

*Defined in [bigwig.ts:16](https://github.com/gmod/bbi-js/blob/e20e58c/src/bigwig.ts#L16)*

Gets features from a BigWig file

**Parameters:**

| Name | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| refName | `string` | - |  The chromosome name |
| start | `number` | - |  The start of a region |
| end | `number` | - |  The end of a region |
| `Default value` opts | [Options](../interfaces/_bigwig_.options.md) |  { scale: 1 } |  An object containing basesPerSpan (e.g. pixels per basepair) or scale used to infer the zoomLevel to use |

**Returns:** `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

___
<a id="getheader"></a>

###  getHeader

▸ **getHeader**(): `Promise`<[Header](../interfaces/_bbi_.header.md)>

*Inherited from [BBIFile](_bbi_.bbifile.md).[getHeader](_bbi_.bbifile.md#getheader)*

*Defined in [bbi.ts:68](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L68)*

**Returns:** `Promise`<[Header](../interfaces/_bbi_.header.md)>

___
<a id="getview"></a>

### `<Protected>` getView

▸ **getView**(scale: *`number`*): `Promise`<[BlockView](_blockview_.blockview.md)>

*Inherited from [BBIFile](_bbi_.bbifile.md).[getView](_bbi_.bbifile.md#getview)*

*Defined in [bbi.ts:255](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L255)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| scale | `number` |

**Returns:** `Promise`<[BlockView](_blockview_.blockview.md)>

___
<a id="initdata"></a>

###  initData

▸ **initData**(): `Promise`<`any`>

*Inherited from [BBIFile](_bbi_.bbifile.md).[initData](_bbi_.bbifile.md#initdata)*

*Defined in [bbi.ts:60](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L60)*

**Returns:** `Promise`<`any`>

___

