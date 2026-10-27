import { append, clear, div } from './dom';
import { t } from '../i18n';

/** Shared modal shell: dim overlay, framed panel, escapable. */
export class Modal {
  readonly root: HTMLDivElement;
  private titleNode: HTMLDivElement;
  readonly body: HTMLDivElement;
  readonly foot: HTMLDivElement;
  private onCloseCb: (() => void) | null = null;

  constructor(wide = false) {
    this.root = div('overlay hidden');
    const modal = div(`modal${wide ? ' wide' : ''}`);
    const head = div('modal-head');
    this.titleNode = div('mt', '');
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-x';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => this.close());
    append(head, this.titleNode, closeBtn);

    this.body = div('modal-body');
    this.foot = div('modal-foot');
    append(modal, head, this.body, this.foot);
    append(this.root, modal);

    // Click the dim area to dismiss.
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root) this.close();
    });
  }

  get isOpen(): boolean {
    return !this.root.classList.contains('hidden');
  }

  open(title: string, onClose?: () => void): void {
    this.titleNode.textContent = t(title);
    this.onCloseCb = onClose ?? null;
    this.root.classList.remove('hidden');
  }

  close(): void {
    this.root.classList.add('hidden');
    clear(this.body);
    clear(this.foot);
    const cb = this.onCloseCb;
    this.onCloseCb = null;
    cb?.();
  }
}
