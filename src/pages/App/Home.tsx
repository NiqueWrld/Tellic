import { useCallback, useEffect, useState } from 'react';
import type { AdbApi } from '../../preload';
import type { AdbDevice } from '../../main';
import { useDevice } from '../../context';

declare global {
  interface Window {
    adb: AdbApi;
  }
}

const STATE_STYLES: Record<string, string> = {
  device:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  unauthorized:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  offline:
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function stateClass(state: string): string {
  return (
    STATE_STYLES[state] ||
    'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  );
}

function deviceLabel(d: AdbDevice): string {
  return d.model?.replace(/_/g, ' ') || d.product || d.device || d.serial;
}

export function HomePage() {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { selected, selectDevice, isSelected } = useDevice();

  const refresh = useCallback(async () => {
    if (!window.adb) {
      setError('Preload bridge not available. Restart the app.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await window.adb.listDevices();
      if (!res.ok) {
        setError(res.error || 'Failed to query adb.');
        setDevices([]);
      } else {
        setDevices(res.devices);
      }
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Keep the selected device object in sync with the live device list.
  useEffect(() => {
    if (!selected) {
      // Auto-select the first available device when none is chosen.
      const first = devices.find((d) => d.state === 'device');
      if (first) selectDevice(first);
      return;
    }
    const fresh = devices.find((d) => d.serial === selected.serial);
    if (fresh && fresh !== selected) selectDevice(fresh);
    else if (!fresh && devices.length > 0) {
      // Previously selected device is no longer connected.
      selectDevice(null);
    }
  }, [devices, selected, selectDevice]);

  const handleSelect = useCallback(
    (device: AdbDevice) => {
      if (device.state !== 'device') return;
      selectDevice(isSelected(device.serial) ? null : device);
    },
    [selectDevice, isSelected],
  );

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
            Connected devices
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Devices detected via{' '}
            <code className="text-indigo-600 dark:text-indigo-400">
              adb devices -l
            </code>
            {lastUpdated && (
              <>
                {' · last updated '}
                {lastUpdated.toLocaleTimeString()}
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
        >
          <i
            className={`ph ph-arrows-clockwise ${loading ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-4 py-3 text-sm flex items-start gap-2">
          <i className="ph-fill ph-warning-circle mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!error && devices.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
          <i className="ph-duotone ph-device-mobile-slash text-5xl text-gray-400 dark:text-gray-500" />
          <h2 className="mt-3 text-lg font-medium text-gray-800 dark:text-gray-200">
            No devices connected
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Plug in your phone over USB, enable USB debugging, and accept the
            authorization prompt.
          </p>
        </div>
      )}

      {devices.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {devices.map((d) => {
            const active = isSelected(d.serial);
            const selectable = d.state === 'device';
            return (
              <li key={d.serial}>
                <button
                  type="button"
                  onClick={() => handleSelect(d)}
                  disabled={!selectable}
                  aria-pressed={active}
                  className={[
                    'w-full text-left rounded-xl border p-4 flex items-start gap-3 transition-colors',
                    active
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
                    selectable
                      ? 'hover:border-indigo-400 cursor-pointer'
                      : 'opacity-60 cursor-not-allowed',
                  ].join(' ')}
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                    <i className="ph-duotone ph-device-mobile text-2xl" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {deviceLabel(d)}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${stateClass(
                          d.state,
                        )}`}
                      >
                        {d.state}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono truncate">
                      {d.serial}
                    </p>
                    {(d.product || d.transportId) && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                        {d.product && <>product: {d.product}</>}
                        {d.product && d.transportId && ' · '}
                        {d.transportId && <>transport: {d.transportId}</>}
                      </p>
                    )}
                    {active && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        <i className="ph-fill ph-check-circle" />
                        Current device
                      </p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default HomePage;
