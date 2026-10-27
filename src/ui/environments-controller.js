/** The environment picker above the editor and the Environments button that opens the manager. */

import { manageEnvironments } from './environments-dialog.js';
import { byId } from './page.js';

/** Wires the picker and the manager to the state. */
export function startEnvironments(state) {
  const picker = byId('environment');
  const show = () => {
    picker.replaceChildren(new Option('No environment', ''), ...state.get('environments').map(e => new Option(e.name, e.id)));
    picker.value = state.get('activeEnvironmentId') || '';
  };

  picker.addEventListener('change', () => state.set({ activeEnvironmentId: picker.value || null }));
  byId('manage-environments').addEventListener('click', async () => {
    const chosen = await manageEnvironments(state.get('environments'), state.get('activeEnvironmentId'),
      environments => state.set({ environments }));
    if (chosen) state.set({ activeEnvironmentId: chosen });
  });

  state.onChange(changed => { if (changed.has('environments') || changed.has('activeEnvironmentId')) show(); });
  show();
}
