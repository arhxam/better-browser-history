import { createRoot } from 'react-dom/client';
import { Options } from './Options';
import { bootstrap } from './bootstrap';
import './styles.css';

async function main() {
  await bootstrap();
  createRoot(document.getElementById('root')!).render(<Options />);
}
void main();
