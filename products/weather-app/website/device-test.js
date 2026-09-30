const $ = id => document.getElementById(id);
$('origin').textContent = location.origin;
async function refresh() {
  $('refresh').disabled = true;
  try {
    const response = await fetch('/test/status', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    $('origin').textContent = data.origin || location.origin;
    $('download').hidden = !data.apk;
    $('build').textContent = data.apk ? `安装包已就绪 · ${(data.apk.bytes / 1048576).toFixed(1)} MB · 构建于 ${new Date(data.apk.builtAt).toLocaleString()}` : '安装包尚未准备好，请稍后刷新。';
    $('checksum').textContent = data.apk?.sha256 || '尚未生成';
    $('status').textContent = data.ready ? '服务已连通，六座城市的天气缓存可用。' : '服务已连通，部分城市的数据尚未就绪。';
    $('status').className = data.ready ? 'ready' : 'pending';
    $('cities').replaceChildren(...data.cities.map(city => {
      const li = document.createElement('li');
      const states = { 'recent-fetch': '近期采集', stale: '缓存已过期', unavailable: '数据未就绪' };
      li.textContent = `${city.name}：${states[city.state]}${city.fetchedAt ? ` · ${new Date(city.fetchedAt * 1000).toLocaleString()}` : ''}`;
      return li;
    }));
  } catch (error) {
    $('status').textContent = `连接失败：${error.message}。请检查 Wi-Fi、电脑和 Docker 状态。`;
    $('status').className = 'pending';
    $('cities').replaceChildren();
  } finally { $('refresh').disabled = false; }
}
$('refresh').addEventListener('click', refresh);
$('copy').addEventListener('click', () => {
  try {
    // The intended LAN origin is plain HTTP, where the asynchronous Clipboard API is unavailable.
    const input = document.createElement('textarea');
    input.value = $('origin').textContent;
    document.body.append(input); input.select(); input.setSelectionRange(0, input.value.length);
    const success = document.execCommand('copy'); input.remove();
    if (!success) throw new Error('manual copy');
    $('copy-state').textContent = '地址已复制。';
  } catch { $('copy-state').textContent = '请长按上方地址手动复制。'; }
});
refresh();
