/** Count only observed progress, or a successfully completed upload. Abort/error is not delivery. */
export function xhrUpload(
  payload: Uint8Array,
  onBytes: (delta: number) => void,
  url = "https://speed.cloudflare.com/__up"
) {
  const xhr = new XMLHttpRequest();
  let lastLoaded = 0;
  let settled = false;

  const promise = new Promise<boolean>((resolve) => {
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    xhr.open("POST", url, true);
    xhr.timeout = 10_000;
    xhr.upload.onprogress = (event) => {
      if (settled || typeof event.loaded !== "number" || !Number.isFinite(event.loaded)) return;
      const loaded = Math.max(lastLoaded, Math.min(payload.byteLength, event.loaded));
      const delta = loaded - lastLoaded;
      if (delta > 0) {
        onBytes(delta);
        lastLoaded = loaded;
      }
    };
    xhr.onload = () => {
      if (settled) return;
      const success = xhr.status >= 200 && xhr.status < 300;
      if (success && payload.byteLength > lastLoaded) {
        onBytes(payload.byteLength - lastLoaded);
        lastLoaded = payload.byteLength;
      }
      finish(success);
    };
    xhr.onerror = xhr.onabort = xhr.ontimeout = () => finish(false);
    xhr.send(payload as unknown as XMLHttpRequestBodyInit);
  });

  return { promise, abort: () => xhr.abort() };
}
