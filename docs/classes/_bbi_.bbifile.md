[@gmod/bbi](../README.md) > ["bbi"](../modules/_bbi_.md) > [BBIFile](../classes/_bbi_.bbifile.md)

# Class: BBIFile

## Hierarchy

**BBIFile**

↳  [BigBed](_bigbed_.bigbed.md)

↳  [BigWig](_bigwig_.bigwig.md)

## Index

### Constructors

* [constructor](_bbi_.bbifile.md#constructor)

### Properties

* [bbi](_bbi_.bbifile.md#bbi)
* [chroms](_bbi_.bbifile.md#chroms)
* [header](_bbi_.bbifile.md#header)
* [isBE](_bbi_.bbifile.md#isbe)
* [renameRefSeqs](_bbi_.bbifile.md#renamerefseqs)
* [type](_bbi_.bbifile.md#type)

### Methods

* [getHeader](_bbi_.bbifile.md#getheader)
* [getParsers](_bbi_.bbifile.md#getparsers)
* [getUnzoomedView](_bbi_.bbifile.md#getunzoomedview)
* [getView](_bbi_.bbifile.md#getview)
* [initData](_bbi_.bbifile.md#initdata)
* [isBigEndian](_bbi_.bbifile.md#isbigendian)
* [readChromTree](_bbi_.bbifile.md#readchromtree)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BBIFile**(options: *[Options](../interfaces/_bbi_.options.md)*): [BBIFile](_bbi_.bbifile.md)

*Defined in [bbi.ts:42](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L42)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| options | [Options](../interfaces/_bbi_.options.md) |

**Returns:** [BBIFile](_bbi_.bbifile.md)

___

## Properties

<a id="bbi"></a>

### `<Private>` bbi

**● bbi**: *`any`*

*Defined in [bbi.ts:37](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L37)*

___
<a id="chroms"></a>

### `<Private>` chroms

**● chroms**: *`Promise`<[ChromTree](../interfaces/_bbi_.chromtree.md)>*

*Defined in [bbi.ts:39](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L39)*

___
<a id="header"></a>

### `<Private>` header

**● header**: *`Promise`<[Header](../interfaces/_bbi_.header.md)>*

*Defined in [bbi.ts:38](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L38)*

___
<a id="isbe"></a>

### `<Private>` isBE

**● isBE**: *`Promise`<`boolean`>*

*Defined in [bbi.ts:40](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L40)*

___
<a id="renamerefseqs"></a>

###  renameRefSeqs

**● renameRefSeqs**: *`function`*

*Defined in [bbi.ts:42](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L42)*

#### Type declaration
▸(a: *`string`*): `string`

**Parameters:**

| Name | Type |
| ------ | ------ |
| a | `string` |

**Returns:** `string`

___
<a id="type"></a>

### `<Private>` type

**● type**: *`string`*

*Defined in [bbi.ts:41](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L41)*

___

## Methods

<a id="getheader"></a>

###  getHeader

▸ **getHeader**(): `Promise`<[Header](../interfaces/_bbi_.header.md)>

*Defined in [bbi.ts:68](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L68)*

**Returns:** `Promise`<[Header](../interfaces/_bbi_.header.md)>

___
<a id="getparsers"></a>

### `<Private>` getParsers

▸ **getParsers**(isBE: *`boolean`*): `any`

*Defined in [bbi.ts:99](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L99)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| isBE | `boolean` |

**Returns:** `any`

___
<a id="getunzoomedview"></a>

### `<Private>` getUnzoomedView

▸ **getUnzoomedView**(): `Promise`<[BlockView](_blockview_.blockview.md)>

*Defined in [bbi.ts:286](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L286)*

**Returns:** `Promise`<[BlockView](_blockview_.blockview.md)>

___
<a id="getview"></a>

### `<Protected>` getView

▸ **getView**(scale: *`number`*): `Promise`<[BlockView](_blockview_.blockview.md)>

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

*Defined in [bbi.ts:60](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L60)*

**Returns:** `Promise`<`any`>

___
<a id="isbigendian"></a>

### `<Private>` isBigEndian

▸ **isBigEndian**(): `Promise`<`boolean`>

*Defined in [bbi.ts:85](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L85)*

**Returns:** `Promise`<`boolean`>

___
<a id="readchromtree"></a>

### `<Private>` readChromTree

▸ **readChromTree**(): `Promise`<[ChromTree](../interfaces/_bbi_.chromtree.md)>

*Defined in [bbi.ts:195](https://github.com/gmod/bbi-js/blob/e20e58c/src/bbi.ts#L195)*

**Returns:** `Promise`<[ChromTree](../interfaces/_bbi_.chromtree.md)>

___

