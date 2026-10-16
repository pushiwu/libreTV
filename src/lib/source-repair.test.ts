import { afterEach, describe, expect, it, vi } from 'vitest';
import { getEnvSources } from './env-sources';
import { cmsApiUrl } from './cms-url';
afterEach(() => vi.unstubAllEnvs());
describe('deployment source identities', () => {
  it('keeps endpoint identities stable when presets are reordered', () => {
    const a={name:'A',url:'https://a.example.com/api.php/provide/vod'};
    const b={name:'B',url:'https://b.example.com/api.php/provide/vod'};
    vi.stubEnv('DEFAULT_SOURCES',JSON.stringify([a,b]));const first=getEnvSources();
    vi.stubEnv('DEFAULT_SOURCES',JSON.stringify([b,a]));const next=getEnvSources();
    expect(next[0].key).toBe(first[1].key);expect(next[1].key).toBe(first[0].key);
    expect(first[0].key).not.toBe(first[1].key);
  });
});
describe('CMS request URLs', () => {
  it('preserves provider tokens and replaces an existing action', () => {
    const u=new URL(cmsApiUrl('https://cms.example.com/api?token=private&ac=list',{ac:'videolist',wd:'苏州河',pg:'2'}));
    expect(u.searchParams.get('token')).toBe('private');expect(u.searchParams.get('ac')).toBe('videolist');
    expect(u.searchParams.get('wd')).toBe('苏州河');expect(u.searchParams.get('pg')).toBe('2');expect(u.searchParams.getAll('ac')).toHaveLength(1);
  });
});
