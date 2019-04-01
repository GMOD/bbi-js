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
* [featureCache](_bbi_.bbifile.md#featurecache)
* [fileType](_bbi_.bbifile.md#filetype)
* [getHeader](_bbi_.bbifile.md#getheader)
* [headerCache](_bbi_.bbifile.md#headercache)
* [renameRefSeqs](_bbi_.bbifile.md#renamerefseqs)

### Methods

* [_getHeader](_bbi_.bbifile.md#_getheader)
* [getMainHeader](_bbi_.bbifile.md#getmainheader)
* [getParsers](_bbi_.bbifile.md#getparsers)
* [getUnzoomedView](_bbi_.bbifile.md#getunzoomedview)
* [getView](_bbi_.bbifile.md#getview)
* [isBigEndian](_bbi_.bbifile.md#isbigendian)
* [readChromTree](_bbi_.bbifile.md#readchromtree)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new BBIFile**(options: *[Options](../interfaces/_bbi_.options.md)*): [BBIFile](_bbi_.bbifile.md)

*Defined in [bbi.ts:77](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L77)*

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

*Defined in [bbi.ts:72](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L72)*

___
<a id="featurecache"></a>

### `<Protected>` featureCache

**● featureCache**: *`LRU`<`any`, `any`>*

*Defined in [bbi.ts:75](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L75)*

___
<a id="filetype"></a>

### `<Private>` fileType

**● fileType**: *`string`*

*Defined in [bbi.ts:73](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L73)*

___
<a id="getheader"></a>

###  getHeader

**● getHeader**: *`function`*

*Defined in [bbi.ts:77](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L77)*

#### Type declaration
▸(abortSignal?: *`AbortSignal`*): `Promise`<`any`>

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<`any`>

___
<a id="headercache"></a>

### `<Private>` headerCache

**● headerCache**: *[AbortAwareCache](_bbi_.abortawarecache.md)*

*Defined in [bbi.ts:74](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L74)*

___
<a id="renamerefseqs"></a>

### `<Protected>` renameRefSeqs

**● renameRefSeqs**: *`function`*

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

<a id="_getheader"></a>

### `<Private>` _getHeader

▸ **_getHeader**(abortSignal?: *`AbortSignal`*): `Promise`<`any`>

*Defined in [bbi.ts:97](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L97)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<`any`>

___
<a id="getmainheader"></a>

### `<Private>` getMainHeader

▸ **getMainHeader**(abortSignal?: *`AbortSignal`*): `Promise`<[Header](../interfaces/_bbi_.header.md)>

*Defined in [bbi.ts:104](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L104)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<[Header](../interfaces/_bbi_.header.md)>

___
<a id="getparsers"></a>

### `<Private>` getParsers

▸ **getParsers**(isBE: *`boolean`*): `any`

*Defined in [bbi.ts:135](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L135)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| isBE | `boolean` |

**Returns:** `any`

___
<a id="getunzoomedview"></a>

### `<Private>` getUnzoomedView

▸ **getUnzoomedView**(abortSignal?: *`AbortSignal`*): `Promise`<[BlockView](_blockview_.blockview.md)>

*Defined in [bbi.ts:336](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L336)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<[BlockView](_blockview_.blockview.md)>

___
<a id="getview"></a>

### `<Protected>` getView

▸ **getView**(scale: *`number`*, abortSignal?: *`AbortSignal`*): `Promise`<[BlockView](_blockview_.blockview.md)>

*Defined in [bbi.ts:305](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L305)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| scale | `number` |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<[BlockView](_blockview_.blockview.md)>

___
<a id="isbigendian"></a>

### `<Private>` isBigEndian

▸ **isBigEndian**(abortSignal?: *`AbortSignal`*): `Promise`<`boolean`>

*Defined in [bbi.ts:121](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L121)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<`boolean`>

___
<a id="readchromtree"></a>

### `<Private>` readChromTree

▸ **readChromTree**(abortSignal?: *`AbortSignal`*): `Promise`<[ChromTree](../interfaces/_bbi_.chromtree.md)>

*Defined in [bbi.ts:239](https://github.com/gmod/bbi-js/blob/27f8971/src/bbi.ts#L239)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` abortSignal | `AbortSignal` |

**Returns:** `Promise`<[ChromTree](../interfaces/_bbi_.chromtree.md)>

___

