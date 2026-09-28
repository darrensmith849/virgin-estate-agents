/*
 * Cancelling an upload from the browser.
 *
 * One AbortSignal is handed down through unzipping, compressing and sending.
 * Each step stops what it's doing when it fires and throws UploadCancelled,
 * which the uploader treats as "the admin changed their mind", not an error.
 */

export class UploadCancelled extends Error {
  constructor() {
    super("Upload cancelled.");
    this.name = "AbortError";
  }
}

export function throwIfCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) throw new UploadCancelled();
}

/**
 * Settle as soon as `signal` fires, even if `work` is stuck — for instance
 * waiting for the computer to fetch a file from iCloud before it can be read.
 * The stuck work is left to finish in the background and its result ignored.
 */
export function abortable<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work;
  if (signal.aborted) return Promise.reject(new UploadCancelled());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new UploadCancelled());
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(signal.aborted ? new UploadCancelled() : err);
      },
    );
  });
}
