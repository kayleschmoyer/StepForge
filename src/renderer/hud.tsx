import React from 'react';
import ReactDOM from 'react-dom/client';

import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';

import './styles/tokens.css';
import './styles/globals.css';
import './styles/animations.css';

import { RecordingHud } from './components/hud/RecordingHud';

ReactDOM.createRoot(document.getElementById('hud-root') as HTMLElement).render(
  <React.StrictMode>
    <RecordingHud />
  </React.StrictMode>
);
