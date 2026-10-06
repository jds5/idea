import { decodeAll } from './decoder.js';
import { webUrl } from './links.js';

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message.type !== 'qr:open-url' || sender.id !== chrome.runtime.id || !sender.tab || sender.frameId !== 0) return;
  const url = webUrl(message.url);
  if (!url) { respond({ ok: false }); return; }
  chrome.windows.create({ url, type: 'normal', focused: true, setSelfAsOpener: false })
    .then(() => respond({ ok: true }), () => respond({ ok: false }));
  return true;
});

const busy = new Set();
export async function scanTab(tab) {
  if (!tab.id || busy.has(tab.id)) return;
  busy.add(tab.id);
  try {
    await chrome.action.setBadgeText({ tabId: tab.id, text: '' });
    await chrome.action.setTitle({ tabId: tab.id, title: '识别当前页面二维码' });
    const [{ result: wasOpen }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id }, func: () => Boolean(globalThis.__qrLens?.close())
    });
    if (wasOpen) return;
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    const before = await chrome.tabs.sendMessage(tab.id, { type: 'qr:measure' });
    const active = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    if (active[0]?.id !== tab.id) throw new Error('请保持目标标签页激活后重试。');
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
    const current = await chrome.tabs.query({ active: true, windowId: tab.windowId });
    if (current[0]?.id !== tab.id) throw new Error('截图时切换了标签页，请重试。');
    const session = crypto.randomUUID();
    const viewport = await chrome.tabs.sendMessage(tab.id, { type: 'qr:open', screenshot, session, before });
    if (!viewport) throw new Error('页面在截图时移动，请重新点击插件。');
    const bitmap = await createImageBitmap(await (await fetch(screenshot)).blob());
    const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height), Math.sqrt(12000000 / (bitmap.width * bitmap.height)));
    const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const decoded = decodeAll(ctx.getImageData(0, 0, canvas.width, canvas.height));
    decoded.results = decoded.results.map(code => ({ ...code,
      x: code.x * viewport.width / canvas.width, y: code.y * viewport.height / canvas.height,
      width: code.width * viewport.width / canvas.width, height: code.height * viewport.height / canvas.height
    }));
    await chrome.tabs.sendMessage(tab.id, { type: 'qr:results', session, ...decoded });
  } catch (error) {
    const message = /Cannot access|Missing host permission|extensions gallery/i.test(error.message)
      ? '此页面不允许插件运行，请在普通网页使用（本地文件需单独允许访问）。' : error.message;
    await chrome.tabs.sendMessage(tab.id, { type: 'qr:error', message }).catch(() => {});
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' }).catch(() => {});
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#b42318' }).catch(() => {});
    await chrome.action.setTitle({ tabId: tab.id, title: message }).catch(() => {});
  } finally {
    busy.delete(tab.id);
  }
}
chrome.action.onClicked.addListener(scanTab);
