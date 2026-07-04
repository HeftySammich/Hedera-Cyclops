import sanitizeHtml from 'sanitize-html';

// Forum content is stored as sanitized HTML — a small allowlist of inline
// formatting only. No scripts, no iframes, no event handlers, no styles.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'code', 'blockquote'],
  allowedAttributes: {
    a: ['href', 'rel', 'target'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

export function sanitizeBody(input: string): string {
  return sanitizeHtml(input, OPTIONS).trim();
}

export function sanitizePlainText(input: string, maxLength = 2000): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
    .trim()
    .slice(0, maxLength);
}
