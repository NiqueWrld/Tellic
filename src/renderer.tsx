import { createRoot } from 'react-dom/client';
import './index.css';
import { Layout } from './components/Layout';
import { PrivacyGate } from './components/PrivacyGate';
import { ThemeProvider, DeviceProvider } from './context';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <ThemeProvider>
      <PrivacyGate>
        <DeviceProvider>
          <Layout />
        </DeviceProvider>
      </PrivacyGate>
    </ThemeProvider>,
  );
}
