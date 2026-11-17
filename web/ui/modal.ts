import { html, render, type Safe } from '../core/dom';
import { T } from '../texts';

export interface ModalHandle { el: HTMLElement; close: () => void }

/** نافذة: في الجوال تظهر من أسفل الشاشة (CSS). */
export function openModal(title: string, body: Safe, onClose?: () => void): ModalHandle {
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  render(wrap, html`<div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
    <header class="modal-head"><h2>${title}</h2><button class="icon-btn" data-close aria-label="${T.line.close}">✕</button></header>
    <div class="modal-body">${body}</div></div>`);
  document.body.append(wrap);
  document.body.classList.add('no-scroll');
  const close = (): void => {
    wrap.remove();
    if (!document.querySelector('.modal-backdrop')) document.body.classList.remove('no-scroll');
    onClose?.();
  };
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || (e.target as Element).closest('[data-close]')) close();
  });
  wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  wrap.querySelector<HTMLElement>('input, select, textarea, button:not([data-close])')?.focus();
  return { el: wrap, close };
}

export function confirmBox(message: string, labels: { yes: string; no: string }): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const m = openModal(T.appName, html`<p class="confirm-text">${message}</p>
      <div class="actions"><button class="btn primary" data-yes>${labels.yes}</button><button class="btn" data-no>${labels.no}</button></div>`,
    () => { if (!answered) resolve(false); });
    m.el.querySelector('[data-yes]')?.addEventListener('click', () => { answered = true; m.close(); resolve(true); });
    m.el.querySelector('[data-no]')?.addEventListener('click', () => { answered = true; m.close(); resolve(false); });
  });
}
