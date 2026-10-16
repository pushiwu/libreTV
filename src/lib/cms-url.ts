/** Preserve provider query parameters while setting the requested CMS action. */
export function cmsApiUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.href;
}
