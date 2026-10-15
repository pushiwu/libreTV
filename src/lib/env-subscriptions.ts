/**
 * 部署者通过 DEFAULT_SUBSCRIPTIONS 环境变量预置的 SourceList 订阅链接。
 * 格式为 JSON 数组，元素为 URL 字符串或 {url, name} 对象：
 *   ["https://.../sources.json", {"url":"https://.../list.json","name":"名称"}]
 * 与 DEFAULT_SOURCES / DEFAULT_LIVE_SOURCES 的容错策略一致：解析失败整体忽略。
 */
export interface EnvSubscription {
  url: string;
  name?: string;
}

export function getEnvSubscriptions(): EnvSubscription[] {
  // Cloudflare Workers 单个环境变量约有 5 KB 限制，允许使用
  // DEFAULT_SUBSCRIPTIONS_2、_3... 分片后再合并。保留基础变量以兼容旧配置。
  const keys = Object.keys(process.env)
    .filter((key) => /^DEFAULT_SUBSCRIPTIONS(?:_\d+)?$/.test(key))
    .sort((a, b) => {
      const index = (key: string) => (key === 'DEFAULT_SUBSCRIPTIONS' ? 0 : Number(key.slice('DEFAULT_SUBSCRIPTIONS_'.length)) || 0);
      return index(a) - index(b);
    });
  if (keys.length === 0) return [];

  try {
    const list: EnvSubscription[] = [];
    for (const key of keys) {
      const raw = process.env[key];
      if (!raw || !raw.trim()) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error(`${key} 必须是 JSON 数组`);
      list.push(...parsed.map((item, i) => {
      const url = typeof item === 'string' ? item.trim() : typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).url === 'string' ? String((item as Record<string, unknown>).url).trim() : '';
      if (!url || !/^https?:\/\//.test(url)) {
        throw new Error(`${key} 第 ${i + 1} 项不是合法的 http(s) 订阅地址`);
      }
      const name =
        typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).name === 'string'
          ? String((item as Record<string, unknown>).name).trim() || undefined
          : undefined;
      return { url: url.replace(/\/+$/, ''), name };
      }));
    }
    const seen = new Set<string>();
    return list.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  } catch (err) {
    console.warn('[LibreTV] DEFAULT_SUBSCRIPTIONS 解析失败，已忽略：', err instanceof Error ? err.message : err);
    return [];
  }
}
