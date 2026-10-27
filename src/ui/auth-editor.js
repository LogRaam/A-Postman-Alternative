/** The Auth tab of the editor: no authentication, a Bearer token, or Basic user name and password. */

import { copyAuth } from '../core/auth.js';

const AUTH_LABELS = { none: 'No authentication', bearer: 'Bearer token', basic: 'Basic (user name and password)' };

/** Draws the auth settings into the container and calls onChange with new settings after every edit. */
export function renderAuth(container, auth, onChange) {
  const current = copyAuth(auth);
  container.replaceChildren();

  const type = document.createElement('select');
  type.setAttribute('aria-label', 'Authentication type');
  for (const [value, label] of Object.entries(AUTH_LABELS)) type.append(new Option(label, value));
  type.value = current.type;
  type.addEventListener('change', () => {
    current.type = type.value;
    onChange(copyAuth(current));
    renderAuth(container, current, onChange);
  });
  container.append(type);

  const input = (label, field, inputType) => {
    const wrap = document.createElement('label');
    wrap.className = 'auth-field';
    const caption = document.createElement('span');
    caption.textContent = label;
    const box = document.createElement('input');
    box.type = inputType;
    box.spellcheck = false;
    box.autocomplete = 'off';
    box.value = current[field];
    box.placeholder = 'Text, or a {{variable}}';
    box.addEventListener('input', () => { current[field] = box.value; onChange(copyAuth(current)); });
    wrap.append(caption, box);
    container.append(wrap);
  };
  if (current.type === 'bearer') input('Token', 'token', 'text');
  if (current.type === 'basic') { input('User name', 'username', 'text'); input('Password', 'password', 'password'); }

  if (current.type !== 'none') {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'Sent as the Authorization header. Kept in plain text in this browser and in exports: '
      + 'put secrets in an environment variable ({{token}}) and do not share that environment.';
    container.append(note);
  }
}
