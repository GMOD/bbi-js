[@gmod/bbi](../README.md) > ["range"](../modules/_range_.md) > [Range](../classes/_range_.range.md)

# Class: Range

## Hierarchy

**Range**

## Index

### Constructors

* [constructor](_range_.range.md#constructor)

### Properties

* [ranges](_range_.range.md#ranges)

### Methods

* [contains](_range_.range.md#contains)
* [coverage](_range_.range.md#coverage)
* [getRanges](_range_.range.md#getranges)
* [intersection](_range_.range.md#intersection)
* [isContiguous](_range_.range.md#iscontiguous)
* [max](_range_.range.md#max)
* [min](_range_.range.md#min)
* [rangeOrder](_range_.range.md#rangeorder)
* [toString](_range_.range.md#tostring)
* [union](_range_.range.md#union)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new Range**(arg1: *`any`*, arg2?: *`any`*): [Range](_range_.range.md)

*Defined in [range.ts:7](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L7)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| arg1 | `any` |
| `Optional` arg2 | `any` |

**Returns:** [Range](_range_.range.md)

___

## Properties

<a id="ranges"></a>

### `<Private>` ranges

**● ranges**: *`any`*

*Defined in [range.ts:7](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L7)*

Adapted from a combination of Range and \_Compound in the Dalliance Genome Explorer, (c) Thomas Down 2006-2010.

___

## Methods

<a id="contains"></a>

###  contains

▸ **contains**(pos: *`number`*): `boolean`

*Defined in [range.ts:20](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L20)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| pos | `number` |

**Returns:** `boolean`

___
<a id="coverage"></a>

###  coverage

▸ **coverage**(): `number`

*Defined in [range.ts:105](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L105)*

**Returns:** `number`

___
<a id="getranges"></a>

###  getRanges

▸ **getRanges**(): [Range](_range_.range.md)[]

*Defined in [range.ts:34](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L34)*

**Returns:** [Range](_range_.range.md)[]

___
<a id="intersection"></a>

###  intersection

▸ **intersection**(arg: *[Range](_range_.range.md)*): [Range](_range_.range.md)

*Defined in [range.ts:68](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L68)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| arg | [Range](_range_.range.md) |

**Returns:** [Range](_range_.range.md)

___
<a id="iscontiguous"></a>

###  isContiguous

▸ **isContiguous**(): `boolean`

*Defined in [range.ts:30](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L30)*

**Returns:** `boolean`

___
<a id="max"></a>

###  max

▸ **max**(): `number`

*Defined in [range.ts:16](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L16)*

**Returns:** `number`

___
<a id="min"></a>

###  min

▸ **min**(): `number`

*Defined in [range.ts:12](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L12)*

**Returns:** `number`

___
<a id="rangeorder"></a>

###  rangeOrder

▸ **rangeOrder**(tmpa: *[Range](_range_.range.md)*, tmpb: *[Range](_range_.range.md)*): `number`

*Defined in [range.ts:115](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L115)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| tmpa | [Range](_range_.range.md) |
| tmpb | [Range](_range_.range.md) |

**Returns:** `number`

___
<a id="tostring"></a>

###  toString

▸ **toString**(): `string`

*Defined in [range.ts:38](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L38)*

**Returns:** `string`

___
<a id="union"></a>

###  union

▸ **union**(s1: *[Range](_range_.range.md)*): [Range](_range_.range.md)

*Defined in [range.ts:42](https://github.com/gmod/bbi-js/blob/e20e58c/src/range.ts#L42)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| s1 | [Range](_range_.range.md) |

**Returns:** [Range](_range_.range.md)

___

