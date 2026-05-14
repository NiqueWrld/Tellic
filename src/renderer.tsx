import { createRoot } from 'react-dom/client';
import './index.css';
import { Layout } from './components/Layout';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Layout />);
}
