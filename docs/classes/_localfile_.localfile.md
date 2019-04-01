[@gmod/bbi](../README.md) > ["localFile"](../modules/_localfile_.md) > [LocalFile](../classes/_localfile_.localfile.md)

# Class: LocalFile

## Hierarchy

**LocalFile**

## Index

### Constructors

* [constructor](_localfile_.localfile.md#constructor)

### Properties

* [fd](_localfile_.localfile.md#fd)
* [filename](_localfile_.localfile.md#filename)
* [position](_localfile_.localfile.md#position)

### Methods

* [read](_localfile_.localfile.md#read)
* [readFile](_localfile_.localfile.md#readfile)
* [stat](_localfile_.localfile.md#stat)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new LocalFile**(source: *`string`*): [LocalFile](_localfile_.localfile.md)

*Defined in [localFile.ts:15](https://github.com/gmod/bbi-js/blob/27f8971/src/localFile.ts#L15)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| source | `string` |

**Returns:** [LocalFile](_localfile_.localfile.md)

___

## Properties

<a id="fd"></a>

### `<Private>` fd

**● fd**: *`any`*

*Defined in [localFile.ts:13](https://github.com/gmod/bbi-js/blob/27f8971/src/localFile.ts#L13)*

___
<a id="filename"></a>

### `<Private>` filename

**● filename**: *`string`*

*Defined in [localFile.ts:15](https://github.com/gmod/bbi-js/blob/27f8971/src/localFile.ts#L15)*

___
<a id="position"></a>

### `<Private>` position

**● position**: *`number`*

*Defined in [localFile.ts:14](https://github.com/gmod/bbi-js/blob/27f8971/src/localFile.ts#L14)*

___

## Methods

<a id="read"></a>

###  read

▸ **read**(buffer: *`Buffer`*, offset?: *`number`*, length: *`number`*, position: *`number`*, abortSignal?: *`AbortSignal`*): `Promise`<`number`>

*Defined in [localFile.ts:22](https://github.com/gmod/bbi-js/blob/27f8971/src/localFile.ts#L22)*

**Parameters:**

| Name | Type | Default value |
| ------ | ------ | ------ |
| buffer | `Buffer` | - |
| `Default value` offset | `number` | 0 |
| length | `number` | - |
| position | `number` | - |
| `Optional` abortSignal | `AbortSignal` | - |

**Returns:** `Promise`<`number`>

___
<a id="readfile"></a>

###  readFile

▸ **readFile**(): `Promise`<`Buffer`>

*Defined in [localFile.ts:39](https://github.com/gmod/bbi-js/blob/27f8971/src/localFile.ts#L39)*

**Returns:** `Promise`<`Buffer`>

___
<a id="stat"></a>

###  stat

▸ **stat**(): `Promise`<`any`>

*Defined in [localFile.ts:43](https://github.com/gmod/bbi-js/blob/27f8971/src/localFile.ts#L43)*

**Returns:** `Promise`<`any`>

___

