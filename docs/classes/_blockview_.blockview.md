[@gmod/bbi](../README.md) > ["blockView"](../modules/_blockview_.md) > [BlockView](../classes/_blockview_.blockview.md)

# Class: BlockView

View into a subset of the data in a BigWig file.

Adapted by Robert Buels and Colin Diesh from bigwig.js in the Dalliance Genome Explorer by Thomas Down.

*__constructs__*: 

## Hierarchy

**BlockView**

## Index

### Constructors

* [constructor](_blockview_.blockview.md#constructor)

### Properties

* [bbi](_blockview_.blockview.md#bbi)
* [cirBlockSize](_blockview_.blockview.md#cirblocksize)
* [cirTreeLength](_blockview_.blockview.md#cirtreelength)
* [cirTreeOffset](_blockview_.blockview.md#cirtreeoffset)
* [isBigEndian](_blockview_.blockview.md#isbigendian)
* [isCompressed](_blockview_.blockview.md#iscompressed)
* [refsByName](_blockview_.blockview.md#refsbyname)
* [type](_blockview_.blockview.md#type)

### Methods

* [readWigData](_blockview_.blockview.md#readwigdata)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BlockView**(bbi: *`any`*, refsByName: *`any`*, cirTreeOffset: *`number`*, cirTreeLength: *`number`*, isBigEndian: *`boolean`*, isSummary: *`boolean`*, isCompressed: *`boolean`*, type: *`string`*): [BlockView](_blockview_.blockview.md)

*Defined in [blockView.ts:18](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L18)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bbi | `any` |
| refsByName | `any` |
| cirTreeOffset | `number` |
| cirTreeLength | `number` |
| isBigEndian | `boolean` |
| isSummary | `boolean` |
| isCompressed | `boolean` |
| type | `string` |

**Returns:** [BlockView](_blockview_.blockview.md)

___

## Properties

<a id="bbi"></a>

### `<Private>` bbi

**● bbi**: *`any`*

*Defined in [blockView.ts:14](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L14)*

___
<a id="cirblocksize"></a>

### `<Private>` cirBlockSize

**● cirBlockSize**: *`number`*

*Defined in [blockView.ts:13](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L13)*

___
<a id="cirtreelength"></a>

### `<Private>` cirTreeLength

**● cirTreeLength**: *`number`*

*Defined in [blockView.ts:12](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L12)*

___
<a id="cirtreeoffset"></a>

### `<Private>` cirTreeOffset

**● cirTreeOffset**: *`number`*

*Defined in [blockView.ts:11](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L11)*

___
<a id="isbigendian"></a>

### `<Private>` isBigEndian

**● isBigEndian**: *`boolean`*

*Defined in [blockView.ts:16](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L16)*

___
<a id="iscompressed"></a>

### `<Private>` isCompressed

**● isCompressed**: *`boolean`*

*Defined in [blockView.ts:15](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L15)*

___
<a id="refsbyname"></a>

### `<Private>` refsByName

**● refsByName**: *`any`*

*Defined in [blockView.ts:17](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L17)*

___
<a id="type"></a>

### `<Private>` type

**● type**: *`string`*

*Defined in [blockView.ts:18](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L18)*

___

## Methods

<a id="readwigdata"></a>

###  readWigData

▸ **readWigData**(chrName: *`string`*, min: *`number`*, max: *`number`*): `Promise`<`any`>

*Defined in [blockView.ts:44](https://github.com/gmod/bbi-js/blob/e20e58c/src/blockView.ts#L44)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| chrName | `string` |
| min | `number` |
| max | `number` |

**Returns:** `Promise`<`any`>

___

