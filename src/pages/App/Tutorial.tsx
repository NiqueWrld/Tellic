import { useState } from 'react';
import { useDevice } from '../../context';
import { useContacts, useMessages } from '../../hooks';

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
						Step 1. Enable USB Debugging (Video)
					</h2>
					<p className="text-gray-700 dark:text-gray-300 mb-3 text-sm">
						Watch this first before connecting your device. It shows how to turn
						on Developer Options and USB Debugging on Samsung phones.
					</p>
					<div
						className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
						style={{ paddingTop: '56.25%' }}
					>
						<iframe
							className="absolute inset-0 w-full h-full"
							src="https://www.youtube.com/embed/rv8HGw9y98U"
							title="How to enable USB Debugging on Samsung"
							allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
							referrerPolicy="strict-origin-when-cross-origin"
							allowFullScreen
						/>
					</div>
					<p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
						<a
							href="https://youtu.be/rv8HGw9y98U?si=WkQP3exrdokmz0DH"
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
						<i className="ph ph-device-mobile text-indigo-600" />
						Step 2. Connect your phone
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
						Step 3. Pull contacts
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
						Step 4. Export and sync messages
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
						Step 5. Rebuild from exports (optional)
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
