/** Resolve signed media with bounded concurrency and without mutating raw rows. */
export async function resolveCatalogImages(stores, image, current = () => true) {
  const jobs = [];
  for (const store of stores) {
    for (const field of ['logo', 'cover']) if (store[field]) jobs.push(async () => { store[field] = await image(store[field]); });
    for (const product of store.products) if (product[5]) jobs.push(async () => { product[5] = await image(product[5]); });
  }
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, async () => {
    while (current()) {
      const job = jobs[index++];
      if (!job) return;
      await job();
    }
  }));
  return stores;
}
