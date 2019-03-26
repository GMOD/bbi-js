[@gmod/bbi](../README.md) > ["bigbed"](../modules/_bigbed_.md) > [BigBed](../classes/_bigbed_.bigbed.md)

# Class: BigBed

## Hierarchy

 [BBIFile](_bbi_.bbifile.md)

**↳ BigBed**

## Index

### Constructors

* [constructor](_bigbed_.bigbed.md#constructor)

### Properties

* [renameRefSeqs](_bigbed_.bigbed.md#renamerefseqs)

### Methods

* [getFeatures](_bigbed_.bigbed.md#getfeatures)
* [getHeader](_bigbed_.bigbed.md#getheader)
* [getView](_bigbed_.bigbed.md#getview)
* [initData](_bigbed_.bigbed.md#initdata)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BigBed**(options: *[Options](../interfaces/_bbi_.options.md)*): [BigBed](_bigbed_.bigbed.md)

*Inherited from [BBIFile](_bbi_.bbifile.md).[constructor](_bbi_.bbifile.md#constructor)*

*Defined in [bbi.ts:42](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L42)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| options | [Options](../interfaces/_bbi_.options.md) |

**Returns:** [BigBed](_bigbed_.bigbed.md)

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

▸ **getFeatures**(refName: *`string`*, start: *`number`*, end: *`number`*): `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

*Defined in [bigbed.ts:14](https://github.com/gmod/bbi-js/blob/e20e58c/src/bigbed.ts#L14)*

Gets features from a BigWig file

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| refName | `string` |  The chromosome name |
| start | `number` |  The start of a region |
| end | `number` |  The end of a region |

**Returns:** `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>
array of features

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

