export async function fetchPreview(url: string): Promise<unknown> {
  console.log('[fetchPreview] start', { url });
  const r = await fetch(`${url}?t=${Date.now()}` as string, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!r.ok) {
    console.error('[fetchPreview] failed', { status: r.status, statusText: r.statusText });
    throw new Error('Preview fetch failed');
  }
  const data = (await r.json()) as unknown;
  console.log('[fetchPreview] success');
  return data;
}
