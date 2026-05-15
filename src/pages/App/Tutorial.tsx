import { useEffect, useState } from 'react';
import { useDevice } from '../../context';
import { useContacts, useMessages } from '../../hooks';

const ADB_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/W7nkxS9LMXs';
const ADB_VIDEO_URL = 'https://youtu.be/W7nkxS9LMXs';

export function TutorialPage() {
	const { selectDevice } = useDevice();
	const {
		selected,
		running: contactsRunning,
		error: contactsError,
		progress: contactsProgress,
		pull: startPullContacts,
	} = useContacts();
	const {
		running: messagesRunning,
		error: messagesError,
		progress: messagesProgress,
		pull: startPullMessages,
	} = useMessages();
	const [checkingDevices, setCheckingDevices] = useState(false);
	const [deviceCheckMessage, setDeviceCheckMessage] = useState<string | null>(null);
	const [downloadingAdb, setDownloadingAdb] = useState(false);
	const [adbSetupMessage, setAdbSetupMessage] = useState<string | null>(null);
	const [checkingAdbPath, setCheckingAdbPath] = useState(false);
	const [adbPathAvailable, setAdbPathAvailable] = useState<boolean | null>(null);
	const [adbPathMessage, setAdbPathMessage] = useState<string | null>(null);

	const checkDevicesNow = async () => {
		if (!window.adb) {
			setDeviceCheckMessage('ADB bridge is not available. Restart the app.');
			return;
		}
		setCheckingDevices(true);
		setDeviceCheckMessage(null);
		try {
			const res = await window.adb.listDevices();
			if (!res.ok) {
				setDeviceCheckMessage(res.error || 'Failed to check connected devices.');
				return;
			}
			const ready = res.devices.filter((d) => d.state === 'device');
			if (ready.length === 0) {
				setDeviceCheckMessage('No authorized USB device found yet.');
				return;
			}

			if (!selected || !ready.some((d) => d.serial === selected.serial)) {
				selectDevice(ready[0]);
			}

			setDeviceCheckMessage(
				ready.length === 1
					? `1 connected device found: ${ready[0].serial}`
					: `${ready.length} connected devices found.`,
			);
		} catch (e) {
			setDeviceCheckMessage(e instanceof Error ? e.message : String(e));
		} finally {
			setCheckingDevices(false);
		}
	};

	const downloadAdbNow = async () => {
		if (!window.adb) {
			setAdbSetupMessage('ADB bridge is not available. Restart the app.');
			return;
		}
		if (adbPathAvailable) {
			setAdbSetupMessage('ADB is already available in CMD PATH. Download skipped.');
			return;
		}
		setDownloadingAdb(true);
		setAdbSetupMessage(null);
		try {
			const res = await window.adb.fetchAdb();
			if (!res.ok) {
				setAdbSetupMessage(res.error || res.message || 'Failed to download ADB.');
				return;
			}
			setAdbSetupMessage(
				res.path
					? `ADB downloaded successfully to ${res.path}`
					: res.message,
			);
		} catch (e) {
			setAdbSetupMessage(e instanceof Error ? e.message : String(e));
		} finally {
			setDownloadingAdb(false);
		}
	};

	const checkAdbPathNow = async () => {
		if (!window.adb) {
			setAdbPathAvailable(false);
			setAdbPathMessage('ADB bridge is not available. Restart the app.');
			return;
		}
		setCheckingAdbPath(true);
		try {
			const res = await window.adb.checkAdbInPath();
			if (!res.ok) {
				setAdbPathAvailable(false);
				setAdbPathMessage(res.error || res.message || 'Failed to check CMD PATH.');
				return;
			}
			setAdbPathAvailable(res.available);
			if (res.available && res.locations && res.locations.length > 0) {
				setAdbPathMessage(`${res.message} (${res.locations[0]})`);
			} else {
				setAdbPathMessage(res.message);
			}
		} catch (e) {
			setAdbPathAvailable(false);
			setAdbPathMessage(e instanceof Error ? e.message : String(e));
		} finally {
			setCheckingAdbPath(false);
		}
	};

	useEffect(() => {
		void checkAdbPathNow();
	}, []);

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white">
					Tutorial
				</h1>
				<p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
					Follow these steps to set up Tellic and export your chats safely.
				</p>
			</div>

			<article className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-play-circle text-indigo-600" />
						Step 1. What is ADB? (Video)
					</h2>
					<p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
						Watch this first to understand what ADB is and why Tellic needs USB
						Debugging + device authorization.
					</p>
					<div
						className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
						style={{ paddingTop: '56.25%' }}
					>
						<iframe
							className="absolute inset-0 w-full h-full"
							src={ADB_VIDEO_EMBED_URL}
							title="What is ADB on Android"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
						/>
					</div>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
						<a
							href={ADB_VIDEO_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="text-indigo-600 dark:text-indigo-400 hover:underline"
						>
							Open on YouTube <i className="ph ph-arrow-up-right" />
						</a>
					</p>
				</section>

				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-download-simple text-indigo-600" />
						Step 2. Download ADB
					</h2>
					<div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
							<i className="ph ph-download-simple text-indigo-600" />
							ADB setup (automatic)
						</h3>
						<p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
							Tellic auto-downloads and bundles ADB for you into
							 <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">resources/adb</code>.
							 You do not need to manually move platform-tools or edit your User PATH.
						</p>
						<div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900">
							<i
								className={`ph-fill ${
									adbPathAvailable
										? 'ph-check-circle text-emerald-600 dark:text-emerald-400'
										: 'ph-x-circle text-gray-400 dark:text-gray-500'
								}`}
							/>
							<span className="text-xs text-gray-700 dark:text-gray-300">
								{adbPathAvailable ? 'ADB is in CMD PATH' : 'ADB is not in CMD PATH'}
							</span>
						</div>
						<div className="mt-3 flex items-center gap-2 flex-wrap">
							<button
								type="button"
								onClick={checkAdbPathNow}
								disabled={checkingAdbPath}
								className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
							>
								<i className={`ph ${checkingAdbPath ? 'ph-spinner animate-spin' : 'ph-magnifying-glass'}`} />
								{checkingAdbPath ? 'Checking PATH…' : 'Check CMD PATH'}
							</button>
							{!adbPathAvailable && (
								<button
									type="button"
									onClick={downloadAdbNow}
									disabled={downloadingAdb}
									className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
								>
									<i className={`ph ${downloadingAdb ? 'ph-spinner animate-spin' : 'ph-download-simple'}`} />
									{downloadingAdb ? 'Downloading ADB…' : 'Download ADB now'}
								</button>
							)}
						</div>
						{adbPathMessage && (
							<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{adbPathMessage}</p>
						)}
						{adbSetupMessage && (
							<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{adbSetupMessage}</p>
						)}
					</div>
				</section>

				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-device-mobile text-indigo-600" />
						Step 3. Connect your phone
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Go to the Devices page, connect your phone over USB, and accept the
						debugging authorization prompt.
					</p>
					<div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
						<i
							className={`ph-fill ${
								selected
									? 'ph-check-circle text-emerald-600 dark:text-emerald-400'
									: 'ph-x-circle text-gray-400 dark:text-gray-500'
							}`}
						/>
						<span className="text-xs text-gray-700 dark:text-gray-300">
							{selected ? 'Device connected' : 'No connected device selected'}
						</span>
						{selected?.serial && (
							<code className="text-[11px] text-indigo-600 dark:text-indigo-400">
								{selected.serial}
							</code>
						)}
					</div>
					<div className="mt-3 flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={checkDevicesNow}
							disabled={checkingDevices}
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
						>
							<i className={`ph ${checkingDevices ? 'ph-spinner animate-spin' : 'ph-plugs-connected'}`} />
							{checkingDevices ? 'Checking…' : 'Check devices now'}
						</button>
						<a
							href="#/"
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
						>
							<i className="ph ph-arrow-right" />
							Open Devices page
						</a>
					</div>
					{deviceCheckMessage && (
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							{deviceCheckMessage}
						</p>
					)}
				</section>

				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-address-book text-indigo-600" />
						Step 4. Pull contacts
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Open Contacts, then click Pull contacts. This creates or refreshes
						your local contacts list.
					</p>
					<div className="mt-3 flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={startPullContacts}
							disabled={!selected || contactsRunning}
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
						>
							<i className={`ph ${contactsRunning ? 'ph-spinner animate-spin' : 'ph-address-book'}`} />
							{contactsRunning ? 'Pulling contacts…' : 'Pull contacts now'}
						</button>
						<a
							href="#/contacts"
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
						>
							<i className="ph ph-arrow-right" />
							Open Contacts page
						</a>
					</div>
					{!selected && (
						<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
							Select a device on the Devices page first.
						</p>
					)}
					{contactsProgress?.message && (
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							{contactsProgress.message}
						</p>
					)}
					{contactsError && (
						<p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
							{contactsError}
						</p>
					)}
				</section>

				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-chats-circle text-indigo-600" />
						Step 5. Export and sync messages
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Open Messages and run Export all chats (first run) or Sync new
						messages (next runs). Tellic only adds new messages.
					</p>
					<div className="mt-3 flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={startPullMessages}
							disabled={!selected || messagesRunning}
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
						>
							<i className={`ph ${messagesRunning ? 'ph-spinner animate-spin' : 'ph-chats-circle'}`} />
							{messagesRunning ? 'Exporting…' : 'Export/Sync messages now'}
						</button>
						<a
							href="#/messages"
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
						>
							<i className="ph ph-arrow-right" />
							Open Messages page
						</a>
					</div>
					{!selected && (
						<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
							Select a device on the Devices page first.
						</p>
					)}
					{messagesProgress?.message && (
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							{messagesProgress.message}
						</p>
					)}
					{messagesError && (
						<p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
							{messagesError}
						</p>
					)}
				</section>

				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-arrows-counter-clockwise text-indigo-600" />
						Step 6. Rebuild from exports (optional)
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						If needed, use Rebuild from exports to regenerate messages from
						existing text export files.
					</p>
				</section>
			</article>
		</div>
	);
}

export default TutorialPage;
