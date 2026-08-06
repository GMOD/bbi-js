/**
 * Throws if `signal` has been aborted, matching the semantics of
 * `signal.throwIfAborted()` without requiring either that method or `reason`.
 *
 * Two reasons not to call the built-in directly. It assumes a *real*
 * `AbortSignal`, and callers pass duck-typed ones; calling a missing method
 * there is a `TypeError` rather than the cancellation the caller asked for,
 * which is a strictly worse failure.
 *
 * And it sets a browser floor. `AbortSignal.prototype.throwIfAborted` and
 * `AbortSignal.reason` are Safari 15.4 / Chrome 100 / Firefox 97 (March 2022),
 * higher than anything else here needs — this package otherwise touches only
 * `.aborted`, and `generic-filehandle2` only forwards a signal to `fetch`.
 *
 * SYNC: @gmod/bam and @gmod/tabix keep identical copies of this.
 */
export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const reason: unknown = signal.reason
    // Spec-faithful: throwIfAborted throws `reason` verbatim, and `reason` is
    // whatever the caller passed to abort() — `controller.abort('too slow')`
    // makes it a string. Coercing it to an Error here would hide that from a
    // consumer who set it deliberately.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw reason === undefined
      ? new DOMException('This operation was aborted', 'AbortError')
      : reason
  }
}

interface Entry<V> {
  promise: Promise<V>
  /**
   * Signals of the callers still waiting on this read. The read is cancelled
   * only once every one of them has given up.
   */
  signals: Set<AbortSignal>
  /** true once a caller joins without a signal, which pins the read */
  pinned: boolean
  /** aborts when every caller has given up; what the read actually runs under */
  controller: AbortController
  /** aborted to take this read's listeners back off its callers' signals */
  dispose: AbortController
  settled: boolean
}

/**
 * One read per key, shared by every caller that asks for it while it is in
 * flight, with a count-bounded LRU of the results.
 *
 * Memoizing a bare promise built from the FIRST caller's signal makes that
 * caller's abort reject every other caller awaiting the same promise — in
 * JBrowse, panning away from one block would fail its still-wanted siblings.
 * This aggregates the callers' signals instead, so the read is cancelled only
 * once every one of them has aborted, and it drops a rejection so a failed
 * fetch is retried rather than cached.
 *
 * This replaces `@gmod/abortable-promise-cache` plus the `@jbrowse/quick-lru`
 * it was given as a backing store. Two behaviours from that package did not
 * come with it, both of which it got wrong:
 *
 * - it never took a listener back off a caller's signal, so a long-lived signal
 *   accumulated one per key it ever touched. `dispose` bounds that here.
 * - a caller that arrived already aborted was registered as a waiter. An abort
 *   listener never fires on an already-aborted signal, so nothing would ever
 *   take it back out of the set: the count could not reach zero and the read
 *   became uncancellable for everyone joined to it.
 *
 * SYNC: ~/src/gmod/tabix-js/src/tabixIndexedFile.ts ChunkCache and
 * ~/src/gmod/bam-js/src/bamFile.ts joinChunkRead — same reference-counted
 * cancellation, bounded by entry count here rather than decompressed bytes.
 */
export class SharedReadCache<K, V> {
  private entries = new Map<string, Entry<V>>()
  private maxEntries: number
  private fill: (key: K, signal: AbortSignal) => Promise<V>

  constructor(
    maxEntries: number,
    fill: (key: K, signal: AbortSignal) => Promise<V>,
  ) {
    this.maxEntries = maxEntries
    this.fill = fill
  }

  get size() {
    return this.entries.size
  }

  async get(cacheKey: string, key: K, signal?: AbortSignal) {
    // Before anything else, including the cache hit: a caller that has already
    // given up must not start a read, and must not be registered as a waiter on
    // someone else's — see join().
    throwIfAborted(signal)

    let entry = this.entries.get(cacheKey)
    if (entry) {
      // re-insert so Map iteration order stays least-recently-used first
      this.entries.delete(cacheKey)
      this.entries.set(cacheKey, entry)
      // A read every caller has abandoned is on its way out but may not have
      // noticed yet. Start a fresh one rather than join one already doomed —
      // joining it means inheriting a cancellation nothing to do with us.
      if (!entry.settled && entry.controller.signal.aborted) {
        this.entries.delete(cacheKey)
        entry = undefined
      }
    }
    entry ??= this.start(cacheKey, key)
    // Only a read still running has anything to cancel. Joining a settled one
    // would add this caller to a set nothing will ever take it out of, since
    // the entry drops its abort listeners when it settles.
    if (!entry.settled) {
      this.join(entry, signal)
    }

    try {
      const value = await entry.promise
      // the read finished, but this caller gave up while waiting for it
      throwIfAborted(signal)
      return value
    } catch (e) {
      // Prefer this caller's own cancellation to whatever the shared read
      // reported. If we asked to stop, that is the answer we want — and when
      // the read itself was cancelled it is because we, and everyone else,
      // asked it to.
      throwIfAborted(signal)
      throw e
    }
  }

  // The read runs under the entry's own controller rather than any one caller's
  // signal, because the read is shared: it must survive until every caller
  // waiting on it has given up. join() is what registers them.
  private start(cacheKey: string, key: K) {
    const controller = new AbortController()
    const entry: Entry<V> = {
      promise: this.fill(key, controller.signal),
      signals: new Set(),
      pinned: false,
      controller,
      dispose: new AbortController(),
      settled: false,
    }
    this.entries.set(cacheKey, entry)
    const settle = () => {
      entry.settled = true
      // nothing reads these once the read has settled, and holding them would
      // pin each caller's AbortController behind this entry
      entry.dispose.abort()
      entry.signals.clear()
    }
    // `.then(f, g)` rather than `.finally(f)` so the handler's own promise never
    // carries an unhandled rejection.
    void entry.promise.then(
      () => {
        settle()
        this.evict()
      },
      () => {
        settle()
        // a failed read caches nothing, so the next caller starts over rather
        // than inheriting the failure
        if (this.entries.get(cacheKey) === entry) {
          this.entries.delete(cacheKey)
        }
      },
    )
    return entry
  }

  // Register a caller's interest, so the read survives until that caller has
  // given up too.
  //
  // A caller with no signal cannot give up, so it pins the read: there is no
  // longer any set of aborts that should stop it. That is the honest reading of
  // a caller that never asked to be cancellable, and it means one signal-free
  // consumer makes that read uncancellable for everyone joined to it.
  private join(entry: Entry<V>, signal?: AbortSignal) {
    if (signal === undefined) {
      entry.pinned = true
    } else if (signal.aborted) {
      // get() rejects such a caller before it reaches here, with no `await` in
      // between, so this is unreachable today. It is here because this is the
      // bug that shipped in the package this replaced, and an invariant that
      // fails this quietly should not rest on a check twenty lines away.
      if (!entry.pinned && entry.signals.size === 0) {
        entry.controller.abort(signal.reason)
      }
    } else if (!entry.signals.has(signal)) {
      // guarded so one signal joining the same key twice does not add two
      // listeners
      entry.signals.add(signal)
      signal.addEventListener(
        'abort',
        () => {
          entry.signals.delete(signal)
          if (!entry.pinned && entry.signals.size === 0) {
            entry.controller.abort(signal.reason)
          }
        },
        // `once` covers the abort firing; `dispose` covers it never firing
        { once: true, signal: entry.dispose.signal },
      )
    }
  }

  // Evict from the least-recently-used end, skipping reads still in flight:
  // those are not results yet, and dropping one would lose the de-duplication
  // every caller joined to it is relying on.
  private evict() {
    if (this.entries.size <= this.maxEntries) {
      return
    }
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= this.maxEntries) {
        break
      }
      if (entry.settled) {
        this.entries.delete(key)
      }
    }
  }
}
