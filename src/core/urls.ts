export const toRedditUrl = (permalink: string): string =>
  permalink.startsWith('http')
    ? permalink
    : `https://www.reddit.com${permalink.startsWith('/') ? permalink : `/${permalink}`}`;
