[@gmod/bbi](../README.md) > ["util"](../modules/_util_.md)

# External module: "util"

## Index

### Classes

* [AbortError](../classes/_util_.aborterror.md)

### Functions

* [abortBreakPoint](_util_.md#abortbreakpoint)
* [checkAbortSignal](_util_.md#checkabortsignal)
* [groupBlocks](_util_.md#groupblocks)

---

## Functions

<a id="abortbreakpoint"></a>

###  abortBreakPoint

▸ **abortBreakPoint**(signal?: *`AbortSignal`*): `Promise`<`void`>

*Defined in [util.ts:68](https://github.com/gmod/bbi-js/blob/27f8971/src/util.ts#L68)*

Skips to the next tick, then runs `checkAbortSignal`. Await this to inside an otherwise synchronous loop to provide a place to break when an abort signal is received.

**Parameters:**

| Name | Type | Description |
| ------ | ------ | ------ |
| `Optional` signal | `AbortSignal` |   |

**Returns:** `Promise`<`void`>

___
<a id="checkabortsignal"></a>

###  checkAbortSignal

▸ **checkAbortSignal**(signal?: *`AbortSignal`*): `void`

*Defined in [util.ts:46](https://github.com/gmod/bbi-js/blob/27f8971/src/util.ts#L46)*

Properly check if the given AbortSignal is aborted. Per the standard, if the signal reads as aborted, this function throws either a DOMException AbortError, or a regular error with a `code` attribute set to `ERR_ABORTED`.

For convenience, passing `undefined` is a no-op

**Parameters:**

| Name | Type |
| ------ | ------ |
| `Optional` signal | `AbortSignal` |

**Returns:** `void`
nothing

___
<a id="groupblocks"></a>

###  groupBlocks

▸ **groupBlocks**(blocks: *`any`[]*): `any`[]

*Defined in [util.ts:10](https://github.com/gmod/bbi-js/blob/27f8971/src/util.ts#L10)*

**Parameters:**

| Name | Type |
| ------ | ------ |
| blocks | `any`[] |

**Returns:** `any`[]

___

