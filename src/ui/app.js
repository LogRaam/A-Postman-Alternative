/** The page: creates the state and starts one controller per feature. Nothing else lives here. */

import { createState } from './state.js';
import { byId, setUpTabs, showSidebarTab } from './page.js';
import { startEditor } from './editor.js';
import { startSender } from './sender.js';
import { startHistory } from './history-controller.js';
import { startCollections } from './collections-controller.js';
import { startEnvironments } from './environments-controller.js';
import { startWorkspaceFile } from './workspace-file.js';

/** Starts the app once the page is loaded. */
export function startApp() {
  const state = createState();
  setUpTabs(byId('request-tabs'));
  setUpTabs(byId('response-tabs'));
  setUpTabs(byId('sidebar-tabs'));
  startEnvironments(state);
  startEditor(state);
  startSender(state);
  startHistory(state);
  startCollections(state);
  startWorkspaceFile(state);
  showSidebarTab(state.get('collections').length ? byId('tab-collections') : byId('tab-history'));
}
