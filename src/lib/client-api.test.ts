import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client-api';
import type { SearchResponse, SearchResultItem, SourceConfig } from './types';

const sources = (count: number): SourceConfig[] => Array.from({ length: count }, (_, i) => ({ key: `s${i}`, name: `源${i}`, url: `https://source${i}.example/api` }));
const item = (sourceKey: string, name = '测试片', typeName = '电影'): SearchResultItem => ({ sourceKey, sourceName: sourceKey, sourceUrl: 'https://example.com/api', vodId: '1', name, typeName });
const stream = (events: unknown[]) => new Response(events.map((e) => JSON.stringify(e)).join('\n') + '\n');

afterEach(() => vi.unstubAllGlobals());

describe('客户端搜索批次与流恢复', () => {
  it.each([false, true])('超过50源全部参与且顺序分批（流式=%s）', async (streaming) => {
    let active = 0;
    let maxActive = 0;
    const batches: string[][] = [];
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      active++;
      maxActive = Math.max(active, maxActive);
      const body = JSON.parse(String(init.body)) as { sources: SourceConfig[] };
      batches.push(body.sources.map((s) => s.key));
      await Promise.resolve();
      const payload: SearchResponse = { list: body.sources.some((s) => s.key === 's100') ? [item('s100')] : [], failures: [] };
      active--;
      return streaming ? stream([{ type: 'done', ...payload }]) : Response.json(payload);
    });
    vi.stubGlobal('fetch', fetchMock);
    const result = await api.search('测试片', sources(101), true, streaming ? { onSource: vi.fn() } : undefined);
    expect(batches.map((b) => b.length)).toEqual([50, 50, 1]);
    expect(batches.flat()).toEqual(sources(101).map((s) => s.key));
    expect(maxActive).toBe(1);
    expect(result.list.map((r) => r.sourceKey)).toEqual(['s100']);
  });

  it('缺done时保留已收到结果，过滤成人和不相关项，并标明未完成源', async () => {
    const onSource = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => stream([
      { type: 'source', sourceKey: 's0', ok: true, list: [item('s0'), item('s0'), { ...item('s0', '无关'), vodId: '2' }, { ...item('s0', '测试片', '伦理片'), vodId: '3' }] },
    ])));
    const result = await api.search('测试片', sources(2), true, { onSource });
    expect(result.list).toEqual([item('s0')]);
    expect(result.failures).toEqual([{ sourceKey: 's1', error: expect.stringContaining('未完成'), timedOut: undefined }]);
    expect(onSource).toHaveBeenCalledTimes(1);
  });

  it('读取过程中网络异常仍保留此前成功的源', async () => {
    let reads = 0;
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      pull(controller) {
        if (reads++ === 0) controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'source', sourceKey: 's0', ok: true, list: [item('s0')] }) + '\n'));
        else controller.error(new TypeError('connection lost'));
      },
    }))));
    const result = await api.search('测试片', sources(2), true, { onSource: vi.fn() });
    expect(result.list).toEqual([item('s0')]);
    expect(result.failures.map((f) => f.sourceKey)).toEqual(['s1']);
  });

  it('真正取消读取会抛出，且不会启动后续批次', async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn(async () => stream([{ type: 'source', sourceKey: 's0', ok: true, list: [item('s0')] }]));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.search('测试片', sources(51), true, {
      signal: controller.signal,
      onSource: () => controller.abort(),
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('仅done的缓存响应仍被保留', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stream([{ type: 'done', list: [item('s0')], failures: [] }])));
    expect((await api.search('测试片', sources(1), true, { onSource: vi.fn() })).list).toEqual([item('s0')]);
  });
});
