/** Run async work over items with limited concurrency (avoids Reddit API stampedes). */
export const mapPool = async <T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Math.min(Math.max(1, concurrency), items.length);

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await mapper(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
};
