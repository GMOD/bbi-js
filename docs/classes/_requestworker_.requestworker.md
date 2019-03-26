[@gmod/bbi](../README.md) > ["requestWorker"](../modules/_requestworker_.md) > [RequestWorker](../classes/_requestworker_.requestworker.md)

# Class: RequestWorker

Worker object for reading data from a bigwig or bigbed file. Manages the state necessary for traversing the index trees and so forth.

Adapted by Robert Buels from bigwig.js in the Dalliance Genome Explorer by Thomas Down.

*__constructs__*: 

## Hierarchy

**RequestWorker**

## Index

### Constructors

* [constructor](_requestworker_.requestworker.md#constructor)

### Properties

* [blocksToFetch](_requestworker_.requestworker.md#blockstofetch)
* [chrId](_requestworker_.requestworker.md#chrid)
* [cirBlockSize](_requestworker_.requestworker.md#cirblocksize)
* [compressed](_requestworker_.requestworker.md#compressed)
* [data](_requestworker_.requestworker.md#data)
* [isBigEndian](_requestworker_.requestworker.md#isbigendian)
* [le](_requestworker_.requestworker.md#le)
* [max](_requestworker_.requestworker.md#max)
* [min](_requestworker_.requestworker.md#min)
* [outstanding](_requestworker_.requestworker.md#outstanding)
* [source](_requestworker_.requestworker.md#source)
* [type](_requestworker_.requestworker.md#type)
* [window](_requestworker_.requestworker.md#window)

### Methods

* [cirFobRecur](_requestworker_.requestworker.md#cirfobrecur)
* [cirFobRecur2](_requestworker_.requestworker.md#cirfobrecur2)
* [cirFobStartFetch](_requestworker_.requestworker.md#cirfobstartfetch)
* [coordFilter](_requestworker_.requestworker.md#coordfilter)
* [parseBigBedBlock](_requestworker_.requestworker.md#parsebigbedblock)
* [parseBigWigBlock](_requestworker_.requestworker.md#parsebigwigblock)
* [parseSummaryBlock](_requestworker_.requestworker.md#parsesummaryblock)
* [readFeatures](_requestworker_.requestworker.md#readfeatures)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new RequestWorker**(data: *[LocalFile](_localfile_.localfile.md)*, chrId: *`number`*, min: *`number`*, max: *`number`*, opts: *[Options](../interfaces/_requestworker_.options.md)*): [RequestWorker](_requestworker_.requestworker.md)

*Defined in [requestWorker.ts:65](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L65)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| data | [LocalFile](_localfile_.localfile.md) |
| chrId | `number` |
| min | `number` |
| max | `number` |
| opts | [Options](../interfaces/_requestworker_.options.md) |

**Returns:** [RequestWorker](_requestworker_.requestworker.md)

___

## Properties

<a id="blockstofetch"></a>

### `<Private>` blocksToFetch

**● blocksToFetch**: *`any`[]*

*Defined in [requestWorker.ts:56](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L56)*

___
<a id="chrid"></a>

### `<Private>` chrId

**● chrId**: *`number`*

*Defined in [requestWorker.ts:58](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L58)*

___
<a id="cirblocksize"></a>

### `<Private>` cirBlockSize

**● cirBlockSize**: *`number`*

*Defined in [requestWorker.ts:62](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L62)*

___
<a id="compressed"></a>

### `<Private>` compressed

**● compressed**: *`boolean`*

*Defined in [requestWorker.ts:64](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L64)*

___
<a id="data"></a>

### `<Private>` data

**● data**: *[LocalFile](_localfile_.localfile.md)*

*Defined in [requestWorker.ts:61](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L61)*

___
<a id="isbigendian"></a>

### `<Private>` isBigEndian

**● isBigEndian**: *`boolean`*

*Defined in [requestWorker.ts:65](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L65)*

___
<a id="le"></a>

### `<Private>` le

**● le**: *`string`*

*Defined in [requestWorker.ts:55](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L55)*

___
<a id="max"></a>

### `<Private>` max

**● max**: *`number`*

*Defined in [requestWorker.ts:60](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L60)*

___
<a id="min"></a>

### `<Private>` min

**● min**: *`number`*

*Defined in [requestWorker.ts:59](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L59)*

___
<a id="outstanding"></a>

### `<Private>` outstanding

**● outstanding**: *`number`*

*Defined in [requestWorker.ts:57](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L57)*

___
<a id="source"></a>

### `<Private>` source

**● source**: *`string` \| `undefined`*

*Defined in [requestWorker.ts:54](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L54)*

___
<a id="type"></a>

### `<Private>` type

**● type**: *`string`*

*Defined in [requestWorker.ts:63](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L63)*

___
<a id="window"></a>

### `<Private>` window

**● window**: *`any`*

*Defined in [requestWorker.ts:53](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L53)*

___

## Methods

<a id="cirfobrecur"></a>

###  cirFobRecur

▸ **cirFobRecur**(offset: *`any`*, level: *`number`*): `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>[]

*Defined in [requestWorker.ts:84](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L84)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| offset | `any` |
| level | `number` |

**Returns:** `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>[]

___
<a id="cirfobrecur2"></a>

### `<Private>` cirFobRecur2

▸ **cirFobRecur2**(cirBlockData: *`Buffer`*, offset: *`number`*, level: *`number`*): `null` \| `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>[]

*Defined in [requestWorker.ts:117](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L117)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| cirBlockData | `Buffer` |
| offset | `number` |
| level | `number` |

**Returns:** `null` \| `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>[]

___
<a id="cirfobstartfetch"></a>

### `<Private>` cirFobStartFetch

▸ **cirFobStartFetch**(offset: *`any`*, fr: *`any`*, level: *`number`*): `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

*Defined in [requestWorker.ts:97](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L97)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| offset | `any` |
| fr | `any` |
| level | `number` |

**Returns:** `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

___
<a id="coordfilter"></a>

### `<Private>` coordFilter

▸ **coordFilter**(f: *[Feature](../interfaces/_feature_.feature.md)*): `boolean`

*Defined in [requestWorker.ts:280](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L280)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| f | [Feature](../interfaces/_feature_.feature.md) |

**Returns:** `boolean`

___
<a id="parsebigbedblock"></a>

### `<Private>` parseBigBedBlock

▸ **parseBigBedBlock**(bytes: *`Buffer`*, startOffset: *`number`*): `any`

*Defined in [requestWorker.ts:216](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L216)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bytes | `Buffer` |
| startOffset | `number` |

**Returns:** `any`

___
<a id="parsebigwigblock"></a>

### `<Private>` parseBigWigBlock

▸ **parseBigWigBlock**(bytes: *`Buffer`*, startOffset: *`number`*): `any`

*Defined in [requestWorker.ts:231](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L231)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bytes | `Buffer` |
| startOffset | `number` |

**Returns:** `any`

___
<a id="parsesummaryblock"></a>

### `<Private>` parseSummaryBlock

▸ **parseSummaryBlock**(bytes: *`Buffer`*, startOffset: *`number`*): `any`

*Defined in [requestWorker.ts:186](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L186)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bytes | `Buffer` |
| startOffset | `number` |

**Returns:** `any`

___
<a id="readfeatures"></a>

### `<Private>` readFeatures

▸ **readFeatures**(): `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

*Defined in [requestWorker.ts:284](https://github.com/gmod/bbi-js/blob/e20e58c/src/requestWorker.ts#L284)*

**Returns:** `Promise`<[Feature](../interfaces/_feature_.feature.md)[]>

___

