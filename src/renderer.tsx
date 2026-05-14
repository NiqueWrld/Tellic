import { createRoot } from 'react-dom/client';
import './index.css';
import { Layout } from './components/Layout';
import { ThemeProvider } from './context';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <ThemeProvider>
      <Layout />
    </ThemeProvider>,
  );
}
