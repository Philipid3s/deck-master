import './style.css';
import { App } from './ui/app';

const host = document.getElementById('app');
if (!host) throw new Error('#app host element is missing');

const app = new App(host);
// Exposed for the headless verification scripts.
(globalThis as unknown as { __app: App }).__app = app;
