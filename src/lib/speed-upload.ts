/** Count only observed progress, or a successfully completed upload. Abort/error is not delivery. */
export function xhrUpload(
  payload: Uint8Array,
  onBytes: (delta: number) => void,
  url = "https://speed.cloudflare.com/__up"
) {
  const xhr = new XMLHttpRequest();
  let lastLoaded = 0;
  const promise = new Promise<boolean>((resolve) => {
    xhr.open("POST", url, true);
    xhr.timeout = 10_000;
    xhr.upload.onprogress = (event) => {
      const loaded = Math.max(lastLoaded, Math.min(payload.byteLength, event.loaded));
      onBytes(loaded - lastLoaded);
      lastLoaded = loaded;
    };
    xhr.onload = () => {
      const success = xhr.status >= 200 && xhr.status < 300;
      if (success) onBytes(payload.byteLength - lastLoaded);
      resolve(success);
    };
    xhr.onerror = xhr.onabort = xhr.ontimeout = () => resolve(false);
    xhr.send(payload as unknown as XMLHttpRequestBodyInit);
  });
  return { promise, abort: () => xhr.abort() };
}
