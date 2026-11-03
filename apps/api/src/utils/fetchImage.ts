import https from 'https';
import http from 'http';

/**
 * Downloads an image (an agency logo) for embedding in a PDF.
 *
 * Bounded on every side: a slow or dead logo host must never hold up an
 * invoice or manifest, so it times out, follows at most a few redirects,
 * refuses non-2xx responses and caps the size.
 */
export function fetchImageBuffer(url: string, { timeoutMs = 4000, maxBytes = 5 * 1024 * 1024, redirects = 3 } = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        fetchImageBuffer(next, { timeoutMs, maxBytes, redirects: redirects - 1 }).then(resolve, reject);
        return;
      }
      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`Image request failed with ${status}`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (c: Buffer) => {
        size += c.length;
        if (size > maxBytes) {
          req.destroy(new Error('Image too large'));
          return;
        }
        chunks.push(c);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Image request timed out')));
    req.on('error', reject);
  });
}
