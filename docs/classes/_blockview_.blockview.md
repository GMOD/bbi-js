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
* [blockType](_blockview_.blockview.md#blocktype)
* [cirTreeLength](_blockview_.blockview.md#cirtreelength)
* [cirTreeOffset](_blockview_.blockview.md#cirtreeoffset)
* [featureCache](_blockview_.blockview.md#featurecache)
* [isBigEndian](_blockview_.blockview.md#isbigendian)
* [isCompressed](_blockview_.blockview.md#iscompressed)
* [refsByName](_blockview_.blockview.md#refsbyname)

### Methods

* [readWigData](_blockview_.blockview.md#readwigdata)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BlockView**(bbi: *`any`*, refsByName: *`any`*, cirTreeOffset: *`number`*, cirTreeLength: *`number`*, isBigEndian: *`boolean`*, isCompressed: *`boolean`*, blockType: *`string`*, featureCache: *`LRU`<`any`, `any`>*): [BlockView](_blockview_.blockview.md)

*Defined in [blockView.ts:21](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L21)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bbi | `any` |
| refsByName | `any` |
| cirTreeOffset | `number` |
| cirTreeLength | `number` |
| isBigEndian | `boolean` |
| isCompressed | `boolean` |
| blockType | `string` |
| featureCache | `LRU`<`any`, `any`> |

**Returns:** [BlockView](_blockview_.blockview.md)

___

## Properties

<a id="bbi"></a>

### `<Private>` bbi

**● bbi**: *`any`*

*Defined in [blockView.ts:16](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L16)*

___
<a id="blocktype"></a>

### `<Private>` blockType

**● blockType**: *`string`*

*Defined in [blockView.ts:20](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L20)*

___
<a id="cirtreelength"></a>

### `<Private>` cirTreeLength

**● cirTreeLength**: *`number`*

*Defined in [blockView.ts:15](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L15)*

___
<a id="cirtreeoffset"></a>

### `<Private>` cirTreeOffset

**● cirTreeOffset**: *`number`*

*Defined in [blockView.ts:14](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L14)*

___
<a id="featurecache"></a>

### `<Private>` featureCache

**● featureCache**: *`LRU`<`any`, `any`>*

*Defined in [blockView.ts:21](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L21)*

___
<a id="isbigendian"></a>

### `<Private>` isBigEndian

**● isBigEndian**: *`boolean`*

*Defined in [blockView.ts:18](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L18)*

___
<a id="iscompressed"></a>

### `<Private>` isCompressed

**● isCompressed**: *`boolean`*

*Defined in [blockView.ts:17](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L17)*

___
<a id="refsbyname"></a>

### `<Private>` refsByName

**● refsByName**: *`any`*

*Defined in [blockView.ts:19](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L19)*

___

## Methods

<a id="readwigdata"></a>

###  readWigData

▸ **readWigData**(chrName: *`string`*, min: *`number`*, max: *`number`*, observer: *`Observer`<[Feature](../interfaces/_feature_.feature.md)[]>*, abortSignal?: *`AbortSignal`*): `Promise`<`void`>

*Defined in [blockView.ts:47](https://github.com/gmod/bbi-js/blob/27f8971/src/blockView.ts#L47)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| chrName | `string` |
| min | `number` |
| max | `number` |
| observer | `Observer`<[Feature](../interfaces/_feature_.feature.md)[]> |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<`void`>

___

