/** Minimal native menu surface used by compatibility plugins. */
export class MenuItem {
  title = '';
  icon = '';
  callback: ((event: MouseEvent) => void) | undefined;
  disabled = false;
  checked = false;
  separator = false;
  submenu?: Menu;
  setSection(_section: string) {
    return this;
  }
  setWarning(_warning: boolean) {
    return this;
  }
  setSubmenu() {
    return (this.submenu ??= new Menu());
  }
  setTitle(title: string) {
    this.title = title;
    return this;
  }
  setIcon(icon: string) {
    this.icon = icon;
    return this;
  }
  setChecked(checked: boolean) {
    this.checked = checked;
    return this;
  }
  setDisabled(disabled: boolean) {
    this.disabled = disabled;
    return this;
  }
  onClick(callback: (event: MouseEvent) => void) {
    this.callback = callback;
    return this;
  }
  then(callback: (item: this) => void) {
    callback(this);
    return this;
  }
}
export class Menu {
  items: MenuItem[] = [];
  private container?: HTMLElement;
  private cleanup?: () => void;
  private hidden: () => void = () => {};
  protected createItem() {
    return new MenuItem();
  }
  addItem(callback: (item: MenuItem) => void) {
    const item = this.createItem();
    callback(item);
    this.items.push(item);
    return this;
  }
  addSeparator() {
    const item = new MenuItem();
    item.separator = true;
    this.items.push(item);
    return this;
  }
  setNoIcon() {
    return this;
  }
  onHide(callback: () => void) {
    this.hidden = callback;
    return this;
  }
  hide() {
    if (!this.container) return;
    this.cleanup?.();
    this.cleanup = undefined;
    this.container.remove();
    this.container = undefined;
    for (const item of this.items) item.submenu?.hide();
    this.hidden();
  }
  showAtMouseEvent(event: MouseEvent) {
    return this.showAtPosition({ x: event.clientX, y: event.clientY });
  }
  showAtPosition(position: { x: number; y: number }) {
    this.hide();
    const menu = document.createElement('div');
    this.container = menu;
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    Object.assign(menu.style, {
      position: 'fixed',
      left: Math.max(0, position.x) + 'px',
      top: Math.max(0, position.y) + 'px',
      zIndex: '10000',
      minWidth: '180px',
      padding: '5px',
      background: 'var(--background-primary, white)',
      color: 'var(--text-normal, black)',
      boxShadow: '0 4px 20px #0004',
      borderRadius: '6px',
    });
    for (const item of this.items) {
      if (item.separator) {
        const separator = document.createElement('hr');
        separator.setAttribute('role', 'separator');
        menu.append(separator);
        continue;
      }
      const button = document.createElement('button');
      button.setAttribute('role', item.checked ? 'menuitemcheckbox' : 'menuitem');
      if (item.checked) button.setAttribute('aria-checked', 'true');
      button.textContent = (item.checked ? '[x] ' : '') + item.title;
      button.disabled = item.disabled;
      button.className = 'menu-item';
      Object.assign(button.style, { display: 'block', width: '100%', textAlign: 'left' });
      menu.append(button);
      button.addEventListener('click', (event) => {
        if (item.disabled) return;
        if (item.submenu) {
          const rect = button.getBoundingClientRect();
          item.submenu.showAtPosition({ x: rect.right, y: rect.top });
          return;
        }
        this.hide();
        item.callback?.(event);
      });
    }
    document.body.append(menu);
    const rect = menu.getBoundingClientRect();
    menu.style.left = Math.max(0, Math.min(position.x, innerWidth - rect.width)) + 'px';
    menu.style.top = Math.max(0, Math.min(position.y, innerHeight - rect.height)) + 'px';
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menu.contains(event.target) &&
        !(event.target instanceof Element && event.target.closest('.menu'))
      )
        this.hide();
    };
    const keyboard = (event: KeyboardEvent) => {
      if (!menu.contains(document.activeElement)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hide();
      } else if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const buttons = [...menu.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
        buttons[
          (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
        ]?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keyboard);
    this.cleanup = () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyboard);
    };
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return this;
  }
}
