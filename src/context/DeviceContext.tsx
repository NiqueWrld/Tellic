import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AdbDevice } from '../main';

type DeviceContextValue = {
  selected: AdbDevice | null;
  selectDevice: (device: AdbDevice | null) => void;
  isSelected: (serial: string) => boolean;
};

const DeviceContext = createContext<DeviceContextValue | null>(null);

const STORAGE_KEY = 'wapc.selectedDeviceSerial';

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<AdbDevice | null>(null);

  // Restore the last-selected serial (device object will repopulate when
  // the home page next fetches the list and matches by serial).
  useEffect(() => {
    try {
      const serial = localStorage.getItem(STORAGE_KEY);
      if (serial) setSelected({ serial, state: 'unknown' });
    } catch {
      /* ignore */
    }
  }, []);

  const selectDevice = useCallback((device: AdbDevice | null) => {
    setSelected(device);
    try {
      if (device) localStorage.setItem(STORAGE_KEY, device.serial);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const isSelected = useCallback(
    (serial: string) => selected?.serial === serial,
    [selected],
  );

  const value = useMemo<DeviceContextValue>(
    () => ({ selected, selectDevice, isSelected }),
    [selected, selectDevice, isSelected],
  );

  return (
    <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>
  );
}

export function useDevice(): DeviceContextValue {
  const ctx = useContext(DeviceContext);
  if (!ctx) {
    throw new Error('useDevice must be used inside a <DeviceProvider>');
  }
  return ctx;
}
