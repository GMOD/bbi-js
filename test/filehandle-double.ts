import type {
  BufferEncoding,
  FilehandleOptions,
  GenericFilehandle,
} from 'generic-filehandle2'

/**
 * Base class for the filehandle doubles these tests use to observe or delay
 * reads. bbi-js only ever calls `read()`, so subclasses implement that and
 * inherit the rest of `GenericFilehandle` — including `readFile`'s two
 * overloads, which a plain method can't express, and which otherwise force
 * every construction site into an `as unknown as GenericFilehandle` cast.
 *
 * `readFile` and `stat` reject rather than returning something plausible, so
 * that a future read path in `src/` reaching for either fails the suite instead
 * of quietly acquiring the cost. `stat` is the one that matters: on a
 * `RemoteFile` it resolves the file size out of a `Content-Range` response
 * header, which a cross-origin server has to opt into exposing. bbi-js works
 * against plain byte-range reads today and must keep doing so.
 */
export abstract class FilehandleDouble implements GenericFilehandle {
  abstract read(
    length: number,
    position: number,
    opts?: FilehandleOptions,
  ): Promise<Uint8Array<ArrayBuffer>>

  readFile(
    options?: Omit<FilehandleOptions, 'encoding'>,
  ): Promise<Uint8Array<ArrayBuffer>>
  readFile(
    options:
      | BufferEncoding
      | (Omit<FilehandleOptions, 'encoding'> & { encoding: BufferEncoding }),
  ): Promise<string>
  readFile(): Promise<never> {
    return Promise.reject(new Error('bbi-js must not call readFile'))
  }

  stat(): Promise<never> {
    return Promise.reject(
      new Error('bbi-js must not call stat: it needs a CORS-exposed header'),
    )
  }

  close() {
    return Promise.resolve()
  }
}
