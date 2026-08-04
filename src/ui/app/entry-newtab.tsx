import { createRoot } from 'react-dom/client';
import { App } from './App';
import { bootstrap } from './bootstrap';
import './styles.css';

async function main() {
  await bootstrap();
  createRoot(document.getElementById('root')!).render(<App />);
}
void main();
