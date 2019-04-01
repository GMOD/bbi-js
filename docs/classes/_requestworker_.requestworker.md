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

* [bbi](_requestworker_.requestworker.md#bbi)
* [blocksToFetch](_requestworker_.requestworker.md#blockstofetch)
* [chrId](_requestworker_.requestworker.md#chrid)
* [max](_requestworker_.requestworker.md#max)
* [min](_requestworker_.requestworker.md#min)
* [observer](_requestworker_.requestworker.md#observer)
* [opts](_requestworker_.requestworker.md#opts)
* [outstanding](_requestworker_.requestworker.md#outstanding)
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

⊕ **new RequestWorker**(bbi: *[LocalFile](_localfile_.localfile.md)*, chrId: *`number`*, min: *`number`*, max: *`number`*, observer: *`Observer`<[Feature](../interfaces/_feature_.feature.md)[]>*, opts: *[Options](../interfaces/_requestworker_.options.md)*): [RequestWorker](_requestworker_.requestworker.md)

*Defined in [requestWorker.ts:63](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L63)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bbi | [LocalFile](_localfile_.localfile.md) |
| chrId | `number` |
| min | `number` |
| max | `number` |
| observer | `Observer`<[Feature](../interfaces/_feature_.feature.md)[]> |
| opts | [Options](../interfaces/_requestworker_.options.md) |

**Returns:** [RequestWorker](_requestworker_.requestworker.md)

___

## Properties

<a id="bbi"></a>

### `<Private>` bbi

**● bbi**: *[LocalFile](_localfile_.localfile.md)*

*Defined in [requestWorker.ts:61](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L61)*

___
<a id="blockstofetch"></a>

### `<Private>` blocksToFetch

**● blocksToFetch**: *`any`[]*

*Defined in [requestWorker.ts:56](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L56)*

___
<a id="chrid"></a>

### `<Private>` chrId

**● chrId**: *`number`*

*Defined in [requestWorker.ts:58](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L58)*

___
<a id="max"></a>

### `<Private>` max

**● max**: *`number`*

*Defined in [requestWorker.ts:60](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L60)*

___
<a id="min"></a>

### `<Private>` min

**● min**: *`number`*

*Defined in [requestWorker.ts:59](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L59)*

___
<a id="observer"></a>

### `<Private>` observer

**● observer**: *`Observer`<[Feature](../interfaces/_feature_.feature.md)[]>*

*Defined in [requestWorker.ts:63](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L63)*

___
<a id="opts"></a>

### `<Private>` opts

**● opts**: *[Options](../interfaces/_requestworker_.options.md)*

*Defined in [requestWorker.ts:62](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L62)*

___
<a id="outstanding"></a>

### `<Private>` outstanding

**● outstanding**: *`number`*

*Defined in [requestWorker.ts:57](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L57)*

___
<a id="window"></a>

### `<Private>` window

**● window**: *`any`*

*Defined in [requestWorker.ts:55](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L55)*

___

## Methods

<a id="cirfobrecur"></a>

###  cirFobRecur

▸ **cirFobRecur**(offset: *`any`*, level: *`number`*): `void`

*Defined in [requestWorker.ts:85](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L85)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| offset | `any` |
| level | `number` |

**Returns:** `void`

___
<a id="cirfobrecur2"></a>

### `<Private>` cirFobRecur2

▸ **cirFobRecur2**(cirBlockData: *`Buffer`*, offset: *`number`*, level: *`number`*): `void`

*Defined in [requestWorker.ts:115](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L115)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| cirBlockData | `Buffer` |
| offset | `number` |
| level | `number` |

**Returns:** `void`

___
<a id="cirfobstartfetch"></a>

### `<Private>` cirFobStartFetch

▸ **cirFobStartFetch**(offset: *`any`*, fr: *`any`*, level: *`number`*): `Promise`<`void`>

*Defined in [requestWorker.ts:97](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L97)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| offset | `any` |
| fr | `any` |
| level | `number` |

**Returns:** `Promise`<`void`>

___
<a id="coordfilter"></a>

### `<Private>` coordFilter

▸ **coordFilter**(f: *[Feature](../interfaces/_feature_.feature.md)*): `boolean`

*Defined in [requestWorker.ts:277](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L277)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| f | [Feature](../interfaces/_feature_.feature.md) |

**Returns:** `boolean`

___
<a id="parsebigbedblock"></a>

### `<Private>` parseBigBedBlock

▸ **parseBigBedBlock**(bytes: *`Buffer`*, startOffset: *`number`*): [Feature](../interfaces/_feature_.feature.md)[]

*Defined in [requestWorker.ts:213](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L213)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bytes | `Buffer` |
| startOffset | `number` |

**Returns:** [Feature](../interfaces/_feature_.feature.md)[]

___
<a id="parsebigwigblock"></a>

### `<Private>` parseBigWigBlock

▸ **parseBigWigBlock**(bytes: *`Buffer`*, startOffset: *`number`*): [Feature](../interfaces/_feature_.feature.md)[]

*Defined in [requestWorker.ts:228](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L228)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bytes | `Buffer` |
| startOffset | `number` |

**Returns:** [Feature](../interfaces/_feature_.feature.md)[]

___
<a id="parsesummaryblock"></a>

### `<Private>` parseSummaryBlock

▸ **parseSummaryBlock**(bytes: *`Buffer`*, startOffset: *`number`*): [Feature](../interfaces/_feature_.feature.md)[]

*Defined in [requestWorker.ts:183](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L183)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| bytes | `Buffer` |
| startOffset | `number` |

**Returns:** [Feature](../interfaces/_feature_.feature.md)[]

___
<a id="readfeatures"></a>

### `<Private>` readFeatures

▸ **readFeatures**(): `Promise`<`void`>

*Defined in [requestWorker.ts:281](https://github.com/gmod/bbi-js/blob/27f8971/src/requestWorker.ts#L281)*

**Returns:** `Promise`<`void`>

___

