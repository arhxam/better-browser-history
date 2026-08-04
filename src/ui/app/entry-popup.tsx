import { createRoot } from 'react-dom/client';
import { Popup } from './Popup';
import { bootstrap } from './bootstrap';
import './styles.css';

async function main() {
  await bootstrap();
  createRoot(document.getElementById('root')!).render(<Popup />);
}
void main();
