import { rectangle, contained } from './geometry.js';
import { webUrl } from './links.js';

if (!globalThis.__qrLens) {
  let host, dialog, root, session, codes = [], selection = null, draft = null, pointer = null;
  let ready = false, limited = false, previousFocus, keyboardMode = false;
  const measure = () => ({ width: innerWidth, height: innerHeight, x: scrollX, y: scrollY, zoom: visualViewport?.scale ?? 1 });
  const close = () => {
    if (!host) return false;
    dialog.close(); host.remove(); host = null; session = null; pointer = null;
    root = null; dialog = null; codes = []; selection = null; draft = null;
    window.removeEventListener('resize', close);
    visualViewport?.removeEventListener('resize', close);
    previousFocus?.focus({ preventScroll: true }); previousFocus = null;
    return true;
  };
  globalThis.__qrLens = { close };
  const element = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const button = (text, action) => {
    const el = element('button', text); el.type = 'button'; el.addEventListener('click', action); return el;
  };
  function draw() {
    const box = root.querySelector('.selection');
    const rect = draft || selection;
    box.hidden = !rect;
    if (rect) Object.assign(box.style, { left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` });
  }
  function render() {
    if (!host) return;
    draw();
    const visible = codes.filter(code => contained(code, selection));
    root.querySelector('.status').textContent = !ready ? '正在本地识别… 可先框选区域' :
      `${selection ? '选区内' : '当前画面'} · ${visible.length} 个二维码${limited ? '（扫描达到上限，可能有遗漏）' : ''}`;
    const list = root.querySelector('.results'); list.replaceChildren();
    const markers = root.querySelector('.markers'); markers.replaceChildren();
    if (ready && !visible.length) list.append(element('p', selection ? '选区内没有识别结果。请完整框住二维码，或恢复全部结果。' : '未识别到二维码。请放大网页、确保二维码完整清晰后重新打开插件。', 'empty'));
    visible.forEach((code, index) => {
      const marker = element('div', undefined, 'marker');
      marker.append(element('span', String(index + 1), 'marker-number'));
      Object.assign(marker.style, { left: `${code.x}px`, top: `${code.y}px`, width: `${code.width}px`, height: `${code.height}px` });
      markers.append(marker);
      const card = element('article');
      const label = element('label', `二维码 ${index + 1}`);
      const text = element('textarea'); text.value = code.text; text.readOnly = true;
      text.setAttribute('aria-label', `二维码 ${index + 1} 的原始字符串`); text.spellcheck = false;
      label.append(text);
      const copy = button('复制字符串', async () => {
        try {
          await navigator.clipboard.writeText(code.text);
          copy.textContent = '已复制';
        } catch {
          // HTTP pages may not expose navigator.clipboard. Keep a manual selection on failure.
          text.focus(); text.select();
          let copied = false;
          try { copied = document.execCommand('copy'); } catch { /* manual fallback below */ }
          copy.textContent = copied ? '已复制' : '请按 Ctrl/Cmd+C 复制';
        }
      });
      const actions = element('div', undefined, 'actions'); actions.append(copy);
      const url = webUrl(code.text);
      if (url) {
        const openLink = button('在新窗口打开', async () => {
          openLink.disabled = true;
          try {
            const response = await chrome.runtime.sendMessage({ type: 'qr:open-url', url });
            if (!response?.ok) throw new Error('open failed');
            openLink.textContent = '在新窗口打开';
          } catch {
            openLink.textContent = '打开失败，点击重试';
          } finally { openLink.disabled = false; }
        });
        openLink.title = url;
        actions.append(openLink);
      }
      card.append(label, actions); list.append(card);
    });
  }
  function open(message) {
    const now = measure();
    if (Object.keys(now).some(key => now[key] !== message.before[key])) return null;
    close();
    previousFocus = document.activeElement;
    codes = []; selection = null; draft = null; ready = false; limited = false; keyboardMode = false; session = message.session;
    host = element('div'); host.id = 'qr-lens-overlay';
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;z-index:2147483647!important;';
    root = host.attachShadow({ mode: 'closed' });
    const style = element('style', `
      :host{all:initial} *{box-sizing:border-box} [hidden]{display:none!important}
      dialog{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;padding:0;border:0;overflow:hidden;background:transparent;color:#ecf1fc;font:14px/1.5 system-ui,sans-serif;user-select:none}
      dialog::backdrop{background:transparent}
      .surface{position:absolute;inset:0;cursor:crosshair;touch-action:none;background:#10203830}
      .snapshot{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .toolbar,.panel{position:absolute;background:#111d30f5;border:1px solid #ffffff30;border-radius:16px;box-shadow:0 12px 48px #0005}
      .toolbar{top:18px;left:50%;transform:translateX(-50%);padding:10px 14px;display:flex;align-items:center;gap:10px;width:max-content;max-width:calc(100% - 24px);flex-wrap:wrap;justify-content:center}
      strong{white-space:nowrap;font-size:15px}.hint{font-size:12px;color:#c5d4e9}
      button{font:inherit;color:#f5f8ff;background:#ffffff12;border:1px solid #ffffff38;border-radius:9px;padding:7px 11px;cursor:pointer}
      button:hover{background:#ffffff28}button:focus-visible,textarea:focus-visible{outline:3px solid #73ceff;outline-offset:2px}
      .actions{display:flex;flex-wrap:wrap;gap:8px}button:disabled{opacity:.6;cursor:wait}
      .panel{right:18px;top:106px;width:min(350px,calc(100% - 36px));max-height:calc(100% - 124px);padding:16px;overflow:auto;user-select:text;cursor:auto}
      .status{margin:0 0 10px;color:#bce9ff}.results{display:grid;gap:12px}article{border-top:1px solid #ffffff20;padding-top:12px}label{font-size:12px;color:#c5d4e9}
      textarea{display:block;width:100%;height:86px;resize:vertical;margin:7px 0 9px;padding:10px;color:#eef4ff;background:#090f1d;border:1px solid #ffffff25;border-radius:8px;font:13px/1.5 ui-monospace,monospace;user-select:text;overflow:auto}
      .empty{font-size:13px;color:#c5d4e9;margin:12px 0}
      .selection{position:absolute;pointer-events:none;border:2px solid #77d7ff;background:#5dc7ff12;box-shadow:0 0 0 100vmax #07122250}
      .markers{pointer-events:none;position:absolute;inset:0}.marker{position:absolute;border:2px solid #54e3ae;border-radius:4px;color:#07261c;font:bold 12px system-ui;text-shadow:0 0 3px white;background:#54e3ae15}
      .marker-number{position:absolute;top:-23px;left:-2px;background:#54e3ae;min-width:22px;text-align:center;border-radius:5px 5px 0 0;padding:3px;text-shadow:none}
      @media(max-width:650px){.hint{display:none}.toolbar{width:calc(100% - 24px);gap:6px}.panel{top:154px;max-height:calc(100% - 172px)}}
      @media(prefers-reduced-motion:no-preference){button{transition:background .12s}}
    `);
    dialog = element('dialog'); dialog.setAttribute('aria-label', 'QR Lens 页面二维码识别');
    const snapshot = element('canvas', undefined, 'snapshot'); snapshot.setAttribute('aria-hidden', 'true');
    // Decode in the isolated world and paint a canvas: page img-src CSP must not
    // block the frozen screenshot, and a closed shadow keeps results out of page DOM queries.
    fetch(message.screenshot).then(response => response.blob()).then(createImageBitmap).then(bitmap => {
      if (session === message.session && host) {
        snapshot.width = bitmap.width; snapshot.height = bitmap.height;
        snapshot.getContext('2d').drawImage(bitmap, 0, 0);
      }
      bitmap.close();
    }).catch(() => { if (session === message.session) close(); });
    const surface = element('div', undefined, 'surface'); surface.setAttribute('aria-label', '拖动框选二维码区域');
    const markers = element('div', undefined, 'markers'); markers.setAttribute('aria-hidden', 'true');
    const box = element('div', undefined, 'selection'); box.hidden = true;
    const toolbar = element('div', undefined, 'toolbar');
    const panel = element('section', undefined, 'panel'); panel.setAttribute('aria-label', '解析结果');
    const status = element('p', '', 'status'); status.setAttribute('role', 'status');
    panel.append(status, element('div', undefined, 'results'));
    const toggle = button('收起结果', () => { panel.hidden = !panel.hidden; toggle.textContent = panel.hidden ? '显示结果' : '收起结果'; });
    const reset = button('显示全部', () => { selection = null; draft = null; keyboardMode = false; render(); });
    const keyboard = button('键盘框选', () => {
      keyboardMode = true;
      draft = selection ? { ...selection } : { x: innerWidth / 4, y: innerHeight / 4, width: innerWidth / 2, height: innerHeight / 2 };
      status.textContent = '方向键移动，Shift+方向键调整大小，Enter 确定，Esc 取消'; draw();
    });
    toolbar.append(element('strong', 'QR Lens'), element('span', '拖动框选 · 点击空白处退出', 'hint'), reset, toggle, keyboard, button('关闭', close));
    dialog.append(snapshot, surface, markers, box, toolbar, panel);
    root.append(style, dialog); document.documentElement.append(host);
    dialog.showModal();
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (keyboardMode) { keyboardMode = false; draft = null; render(); } else close(); });
    // Only the drawing surface can initiate selection. No document-level pointer handlers.
    let clickToClose = false;
    const updatePointer = event => {
      if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) >= 4) pointer.dragged = true;
      draft = rectangle(pointer, { x: Math.max(0, Math.min(innerWidth, event.clientX)), y: Math.max(0, Math.min(innerHeight, event.clientY)) });
    };
    surface.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault(); keyboardMode = false; draft = null; clickToClose = false;
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false };
      surface.setPointerCapture(event.pointerId);
    });
    surface.addEventListener('pointermove', event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      updatePointer(event); draw();
    });
    surface.addEventListener('pointerup', event => {
      if (!pointer || event.pointerId !== pointer.id) return;
      updatePointer(event);
      clickToClose = !pointer.dragged;
      if (pointer.dragged && draft.width >= 8 && draft.height >= 8) selection = draft;
      draft = null; pointer = null; surface.releasePointerCapture(event.pointerId); render();
    });
    // Remove the overlay only after the click targets it, avoiding click-through to the page.
    surface.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      if (clickToClose) { clickToClose = false; close(); }
    });
    surface.addEventListener('pointercancel', () => { pointer = null; draft = null; clickToClose = false; render(); });
    dialog.addEventListener('keydown', event => {
      event.stopPropagation();
      if (!keyboardMode || !draft) return;
      if (event.key === 'Enter') { event.preventDefault(); selection = draft; draft = null; keyboardMode = false; render(); return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      const dx = event.key === 'ArrowLeft' ? -10 : event.key === 'ArrowRight' ? 10 : 0;
      const dy = event.key === 'ArrowUp' ? -10 : event.key === 'ArrowDown' ? 10 : 0;
      if (event.shiftKey) {
        draft.width = Math.max(8, Math.min(innerWidth - draft.x, draft.width + dx));
        draft.height = Math.max(8, Math.min(innerHeight - draft.y, draft.height + dy));
      } else {
        draft.x = Math.max(0, Math.min(innerWidth - draft.width, draft.x + dx));
        draft.y = Math.max(0, Math.min(innerHeight - draft.height, draft.y + dy));
      }
      draw();
    });
    dialog.addEventListener('wheel', event => { if (!event.composedPath().includes(panel)) event.preventDefault(); }, { passive: false });
    window.addEventListener('resize', close); visualViewport?.addEventListener('resize', close);
    render();
    return now;
  }
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message.type === 'qr:measure') respond(measure());
    if (message.type === 'qr:open') respond(open(message));
    if (message.type === 'qr:results' && message.session === session && host) {
      codes = message.results; limited = message.limited; ready = true; render();
    }
    if (message.type === 'qr:error' && host) root.querySelector('.status').textContent = `识别失败：${message.message} 请关闭后重试。`;
  });
}
