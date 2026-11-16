import { linkifyit } from 'linkify-it';

/**
 * Sanitize user input by stripping all HTML tags.
 * Returns plain text safe for rendering and storage.
 */
export async function sanitizeText(input: string): Promise<string> {
  const replaced = input.replace(/<[^>]*>/g, '').trim();
  const sanitized = await sanitizeMessage(replaced);
  return sanitized;
}

const linkify = linkifyit();
const cache = new Map(); // swap for an LRU/Redis with a TTL in production

const SHORTENERS = new Set(['bit.ly', 't.co', 'tinyurl.com', 'goo.gl', 'is.gd', 'ow.ly', 'buff.ly', 'cutt.ly', 'rb.gy']);

export async function sanitizeMessage(message: string): Promise<string> {
  message = message.replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s/?#]*@\S*/gi, '[BLOCKED LINK]');
  const matches = linkify.match(message) ?? [];
  if (!matches.length) return message;

  async function isBad(rawUrl: any) {
    if (cache.has(rawUrl)) return cache.get(rawUrl);

    let bad = false;
    try {
      let url = rawUrl;

      // Follow shortener redirects (max 5 hops) to find the real destination
      for (let i = 0; i < 5 && SHORTENERS.has(new URL(url).hostname); i++) {
        const res = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(3000) });
        const loc = res.headers.get('location');
        if (!loc) break;
        url = new URL(loc, url).href;
      }

      const u = new URL(url);
      const host = u.hostname;

      // Local checks
      if (
        /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||          // bare IP
        host === 'localhost' ||
        host.split('.').some((l) => l.startsWith('xn--')) || // punycode lookalike
        u.username || u.password                          // user:pass@host tricks
      ) {
        bad = true;
      }

      // Google Web Risk check
      if (!bad && process.env.WEB_RISK_API_KEY) {
        const params = new URLSearchParams({ uri: url, key: process.env.WEB_RISK_API_KEY });
        for (const t of ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE']) params.append('threatTypes', t);
        const res = await fetch(`https://webrisk.googleapis.com/v1/uris:search?${params}`, {
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const data = await res.json();
          bad = Boolean(data.threat);
        } // on API error, fail open (link is kept)
      }
    } catch {
      bad = true; // unparseable URL -> block
    }

    cache.set(rawUrl, bad);
    return bad;
  }

  const verdicts = await Promise.all(matches.map((m: any) => isBad(m.url)));

  // Replace from the end so earlier indexes stay valid
  let result = message;
  for (let i = matches.length - 1; i >= 0; i--) {
    if (verdicts[i]) {
      result = result.slice(0, matches[i].index) + '[BLOCKED LINK]' + result.slice(matches[i].lastIndex);
    }
  }
  return result;
}