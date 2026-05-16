import { useEffect, useState } from 'react';
import { useDevice } from '../../context';
import { useContacts, useMessages } from '../../hooks';

const ADB_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/W7nkxS9LMXs';
const ADB_VIDEO_URL = 'https://youtu.be/W7nkxS9LMXs';
const WASAVER_RELEASE_URL =
	'https://github.com/NiqueWrld/Tellic/releases/tag/app-v1.0.0';
// Where Tellic stores your local archive. Mirrors `app.getPath('userData')`
// on Windows for productName "Tellic".
const DATA_FOLDER_PATH = '%APPDATA%\\Tellic';

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
	const [checkingWaSaver, setCheckingWaSaver] = useState(false);
	const [waSaverInstalled, setWaSaverInstalled] = useState<boolean | null>(null);
	const [waSaverMessage, setWaSaverMessage] = useState<string | null>(null);
	const [showAdbAdvanced, setShowAdbAdvanced] = useState(false);
	const [showTroubleshooting, setShowTroubleshooting] = useState(false);
	const [pathCopied, setPathCopied] = useState(false);

	const copyDataPath = async () => {
		try {
			await navigator.clipboard.writeText(DATA_FOLDER_PATH);
			setPathCopied(true);
			window.setTimeout(() => setPathCopied(false), 1500);
		} catch {
			/* clipboard may be unavailable; ignore */
		}
	};

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

	const checkWaSaverNow = async () => {
		if (!window.adb) {
			setWaSaverMessage('ADB bridge is not available. Restart the app.');
			return;
		}
		if (!selected) {
			setWaSaverMessage('Select a device first (Step 3).');
			return;
		}
		setCheckingWaSaver(true);
		setWaSaverMessage(null);
		try {
			const res = await window.adb.checkWaSaverInstalled(selected.serial);
			if (!res.ok) {
				setWaSaverMessage(res.error || res.message || 'Failed to check WaSaver.');
				setWaSaverInstalled(false);
				return;
			}
			setWaSaverInstalled(res.installed);
			setWaSaverMessage(res.message);
		} catch (e) {
			setWaSaverMessage(e instanceof Error ? e.message : String(e));
			setWaSaverInstalled(false);
		} finally {
			setCheckingWaSaver(false);
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

			{/* ───────────────── Overview / What is Tellic? ───────────────── */}
			<article className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-gray-900 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-900 p-6 space-y-4">
				<h2 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
					<i className="ph-fill ph-info text-indigo-600" />
					What is Tellic?
				</h2>
				<p className="text-sm text-gray-700 dark:text-gray-300">
					Tellic builds a searchable local archive of your WhatsApp chats from an
					Android phone. It connects to the phone over USB using <strong>ADB</strong>
					(Android Debug Bridge), uses a small companion app called <strong>WaSaver</strong>
					to drive WhatsApp&apos;s built-in &ldquo;Export chat&rdquo; flow, then parses
					the resulting text files into a single JSON archive you can browse, search,
					and back up.
				</p>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
					<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
						<div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
							<i className="ph ph-plugs-connected text-indigo-600" /> 1. Connect
						</div>
						<div className="text-gray-500 dark:text-gray-400 mt-1">Phone over USB with debugging enabled</div>
					</div>
					<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
						<div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
							<i className="ph ph-package text-indigo-600" /> 2. Install
						</div>
						<div className="text-gray-500 dark:text-gray-400 mt-1">WaSaver helper APK on the phone</div>
					</div>
					<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
						<div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
							<i className="ph ph-address-book text-indigo-600" /> 3. Pull
						</div>
						<div className="text-gray-500 dark:text-gray-400 mt-1">Contacts, then chats one by one</div>
					</div>
					<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
						<div className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
							<i className="ph ph-database text-indigo-600" /> 4. Browse
						</div>
						<div className="text-gray-500 dark:text-gray-400 mt-1">Searchable JSON archive on your PC</div>
					</div>
				</div>
				<div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
					<i className="ph-fill ph-shield-check text-emerald-600 dark:text-emerald-400 mt-0.5" />
					<div>
						<strong>Your data stays on your computer.</strong> Tellic does not upload
						anything. It only reads chat text — no media, no cloud backups, no accounts.
					</div>
				</div>
			</article>

			{/* ───────────────── Prerequisites ───────────────── */}
			<article className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
				<h2 className="font-semibold flex items-center gap-2 mb-3 text-gray-900 dark:text-white">
					<i className="ph ph-list-checks text-indigo-600" />
					Before you start
				</h2>
				<ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5">
					<li className="flex items-start gap-2">
						<i className="ph ph-check text-emerald-600 mt-1" />
						<span>A Windows PC (this app) and an Android phone with WhatsApp installed and chats present.</span>
					</li>
					<li className="flex items-start gap-2">
						<i className="ph ph-check text-emerald-600 mt-1" />
						<span>A <strong>data-capable USB cable</strong> (the cheap “charge-only” cables that ship with chargers will not work).</span>
					</li>
					<li className="flex items-start gap-2">
						<i className="ph ph-check text-emerald-600 mt-1" />
						<span>A few hundred MB of free disk space (more if you have years of chats).</span>
					</li>
					<li className="flex items-start gap-2">
						<i className="ph ph-clock text-amber-600 mt-1" />
						<span>Around 10–15&nbsp;minutes for first-time setup, plus a minute or two per chat to export.</span>
					</li>
				</ul>
			</article>

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
						Step 2. ADB on this computer
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Tellic ships its own copy of ADB inside the app folder — you don&apos;t need to
						install the Android SDK or edit your Windows PATH. The status below should already say
						&ldquo;ready&rdquo; for most users.
					</p>
					<div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
						<i
							className={`ph-fill ${
								adbPathAvailable
									? 'ph-check-circle text-emerald-600 dark:text-emerald-400'
									: 'ph-warning-circle text-amber-500'
							}`}
						/>
						<span className="text-xs text-gray-700 dark:text-gray-300">
							{adbPathAvailable
								? 'ADB is ready (bundled with Tellic or found on system PATH)'
								: 'Bundled ADB not detected yet'}
						</span>
					</div>
					<div className="mt-3">
						<button
							type="button"
							onClick={() => setShowAdbAdvanced((v) => !v)}
							className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
						>
							<i className={`ph ${showAdbAdvanced ? 'ph-caret-down' : 'ph-caret-right'}`} />
							Advanced / troubleshooting
						</button>
						{showAdbAdvanced && (
							<div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
								<p className="text-xs text-gray-700 dark:text-gray-300">
									Only use these if the status above is not green. Re-check after each action.
								</p>
								<div className="flex items-center gap-2 flex-wrap">
									<button
										type="button"
										onClick={checkAdbPathNow}
										disabled={checkingAdbPath}
										className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
									>
										<i className={`ph ${checkingAdbPath ? 'ph-spinner animate-spin' : 'ph-magnifying-glass'}`} />
										{checkingAdbPath ? 'Checking…' : 'Re-check ADB status'}
									</button>
									<button
										type="button"
										onClick={downloadAdbNow}
										disabled={downloadingAdb}
										className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
									>
										<i className={`ph ${downloadingAdb ? 'ph-spinner animate-spin' : 'ph-download-simple'}`} />
										{downloadingAdb ? 'Downloading…' : 'Re-download bundled ADB'}
									</button>
								</div>
								{adbPathMessage && (
									<p className="text-xs text-gray-500 dark:text-gray-400">{adbPathMessage}</p>
								)}
								{adbSetupMessage && (
									<p className="text-xs text-gray-500 dark:text-gray-400">{adbSetupMessage}</p>
								)}
							</div>
						)}
					</div>
				</section>

				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-device-mobile text-indigo-600" />
						Step 3. Enable ADB on your phone
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						This is the part that trips up most new users. Do these three things on the
						phone <em>before</em> plugging it in.
					</p>

					{/* 3a — Developer Options */}
					<div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							3a. Unlock Developer Options
						</h3>
						<ol className="mt-2 text-sm text-gray-700 dark:text-gray-300 list-decimal pl-5 space-y-1">
							<li>Open <strong>Settings</strong> on your phone.</li>
							<li>Go to <strong>About phone</strong> (or <strong>About device</strong> → <strong>Software information</strong> on Samsung).</li>
							<li>Tap <strong>Build number</strong> seven times. You&apos;ll see a &ldquo;You are now a developer&rdquo; toast.</li>
						</ol>
					</div>

					{/* 3b — USB Debugging */}
					<div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							3b. Turn on USB Debugging
						</h3>
						<ol className="mt-2 text-sm text-gray-700 dark:text-gray-300 list-decimal pl-5 space-y-1">
							<li>Back in <strong>Settings</strong>, open <strong>System</strong> → <strong>Developer options</strong> (location varies by brand).</li>
							<li>Toggle <strong>USB debugging</strong> on. Confirm the warning dialog.</li>
						</ol>
					</div>

					{/* 3c — Plug in & authorize */}
					<div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							3c. Plug in and authorize this computer
						</h3>
						<ol className="mt-2 text-sm text-gray-700 dark:text-gray-300 list-decimal pl-5 space-y-1">
							<li>Plug the phone into your PC with a <strong>data-capable USB cable</strong>.</li>
							<li>If a USB-mode chooser appears, pick <strong>File Transfer</strong> / <strong>MTP</strong> (not &ldquo;Charging only&rdquo;).</li>
							<li>On the phone, accept the <strong>&ldquo;Allow USB debugging?&rdquo;</strong> prompt and tick <strong>&ldquo;Always allow from this computer&rdquo;</strong>.</li>
						</ol>
						<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
							Didn&apos;t see the prompt? Unplug, lock then unlock the phone, plug it back in,
							and click <em>Check devices now</em> below.
						</p>
					</div>
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
						<i className="ph ph-package text-indigo-600" />
						Step 4. Install WaSaver on the phone
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						<strong>WaSaver</strong> is a tiny open-source Android app that automates
						WhatsApp&apos;s built-in <em>&ldquo;Export chat&rdquo;</em> share-sheet so Tellic
						can grab one chat after another without you tapping through every dialog.
						It runs <strong>only on the phone</strong>, never reads media, never connects
						to the internet, and you uninstall it like any other app when you&apos;re done.
					</p>
					<div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
						<div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white dark:bg-gray-900 mb-3">
							<i
								className={`ph-fill ${
									waSaverInstalled
										? 'ph-check-circle text-emerald-600 dark:text-emerald-400'
										: 'ph-x-circle text-gray-400 dark:text-gray-500'
								}`}
							/>
							<span className="text-xs text-gray-700 dark:text-gray-300">
								{waSaverInstalled ? 'WaSaver is installed' : 'WaSaver status unknown'}
							</span>
						</div>
						<div className="mt-3 flex items-center gap-2 flex-wrap">
							<a
								href={WASAVER_RELEASE_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
							>
								<i className="ph ph-arrow-up-right" />
								Open WaSaver GitHub release
							</a>
							<button
								type="button"
								onClick={checkWaSaverNow}
								disabled={checkingWaSaver || !selected}
								className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
							>
								<i className={`ph ${checkingWaSaver ? 'ph-spinner animate-spin' : 'ph-magnifying-glass'}`} />
								{checkingWaSaver ? 'Checking…' : 'Check installation'}
							</button>
						</div>
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							<strong>Easiest:</strong> open the release page above on your phone and install the APK directly.
							You&apos;ll need to allow your browser to <em>&ldquo;Install unknown apps&rdquo;</em> the first time.
						</p>
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							<strong>Alternative (from your PC):</strong> download the APK, then run the command
							below in a terminal (replace the path with where you saved the file). Your phone must be
							connected and authorized from Step 3.
						</p>
						<pre className="mt-2 bg-gray-900 text-gray-100 rounded-lg p-3 text-sm overflow-x-auto">
							<code>adb install -r path\to\wasaver.apk</code>
						</pre>
						<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
							If install is blocked, allow USB install prompts on your phone
							(<em>Developer options → Install via USB</em> on some brands) and try again.
						</p>
						{waSaverMessage && (
							<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
								{waSaverMessage}
							</p>
						)}
						{!selected && (
							<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
								Connect and authorize a device first (Step 3).
							</p>
						)}
					</div>
				</section>

				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph ph-address-book text-indigo-600" />
						Step 5. Pull contacts
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Tellic reads the WhatsApp contacts list directly from your phone’s contacts
						database over ADB and saves it locally as <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">contacts.json</code>.
						This takes a few seconds and only needs to be re-run when your contacts change.
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
						Step 6. Export and sync messages
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Tellic uses WaSaver to walk through each WhatsApp chat and trigger
						<em> &ldquo;Export chat (without media)&rdquo;</em>, then pulls the resulting
						<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">.txt</code>
						files back and parses them into a single archive.
					</p>
					<ul className="mt-2 text-xs text-gray-500 dark:text-gray-400 list-disc pl-5 space-y-1">
						<li>First run can take a while — roughly a minute per chat, more for very large ones. Leave the phone unlocked and plugged in.</li>
						<li>Re-running is <strong>incremental</strong>: only new messages are appended to the archive.</li>
						<li>Don&apos;t touch the phone&apos;s WhatsApp screen while a pull is in progress.</li>
					</ul>
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
						Step 7. Rebuild from exports (optional)
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						If the archive ever gets out of sync, use <em>Rebuild from exports</em> on the
						Messages page to regenerate <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">messages.json</code>
						from the raw <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">.txt</code>
						files already on disk. No phone or ADB connection required.
					</p>
				</section>

				{/* ───────────────── Step 8 — You're done ───────────────── */}
				<section>
					<h2 className="font-semibold flex items-center gap-2 mb-2 text-gray-900 dark:text-white">
						<i className="ph-fill ph-flag-checkered text-emerald-600" />
						Step 8. You&apos;re done
					</h2>
					<p className="text-sm text-gray-700 dark:text-gray-300">
						Your archive lives on this PC at the path below. Copy it to back it up, move
						it between machines, or feed <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">messages.json</code>
						into your own tooling.
					</p>
					<div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
						<div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
							Data folder
						</div>
						<div className="flex items-center gap-2 flex-wrap">
							<code className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs text-gray-800 dark:text-gray-200 break-all">
								{DATA_FOLDER_PATH}
							</code>
							<button
								type="button"
								onClick={copyDataPath}
								className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
							>
								<i className={`ph ${pathCopied ? 'ph-check' : 'ph-copy'}`} />
								{pathCopied ? 'Copied!' : 'Copy path'}
							</button>
						</div>
						<p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
							Paste the path into the Windows&nbsp;Explorer address bar to open it. Contains
							<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">contacts.json</code>,
							<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">messages.json</code> and the
							<code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Exported Chats</code> folder of raw <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.txt</code> files.
						</p>
					</div>
					<div className="mt-3 flex items-center gap-2 flex-wrap">
						<a
							href="#/messages"
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
						>
							<i className="ph ph-chats-circle" />
							Browse your messages
						</a>
						<a
							href="#/contacts"
							className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
						>
							<i className="ph ph-address-book" />
							Browse contacts
						</a>
					</div>
				</section>
			</article>

			{/* ───────────────── Troubleshooting / FAQ ───────────────── */}
			<article className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
				<button
					type="button"
					onClick={() => setShowTroubleshooting((v) => !v)}
					className="w-full flex items-center justify-between text-left"
				>
					<h2 className="font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
						<i className="ph ph-lifebuoy text-indigo-600" />
						Troubleshooting
					</h2>
					<i className={`ph ${showTroubleshooting ? 'ph-caret-up' : 'ph-caret-down'} text-gray-500`} />
				</button>
				{showTroubleshooting && (
					<dl className="mt-4 space-y-4 text-sm">
						<div>
							<dt className="font-semibold text-gray-900 dark:text-white">My phone isn&apos;t showing up at all</dt>
							<dd className="text-gray-700 dark:text-gray-300 mt-1">
								Try a different USB port and a different cable — most &ldquo;dead&rdquo; cables are
								charge-only. On Windows you may also need the manufacturer&apos;s USB driver, or
								Google&apos;s <a className="text-indigo-600 hover:underline" href="https://developer.android.com/studio/run/win-usb" target="_blank" rel="noopener noreferrer">Universal USB driver</a>.
							</dd>
						</div>
						<div>
							<dt className="font-semibold text-gray-900 dark:text-white">Device shows as &ldquo;unauthorized&rdquo;</dt>
							<dd className="text-gray-700 dark:text-gray-300 mt-1">
								The RSA prompt on the phone wasn&apos;t accepted, or this PC was previously denied.
								On the phone: <em>Developer options → Revoke USB debugging authorizations</em>, then
								unplug, plug back in, and accept the prompt (tick <em>Always allow</em>).
							</dd>
						</div>
						<div>
							<dt className="font-semibold text-gray-900 dark:text-white">Device shows as &ldquo;offline&rdquo;</dt>
							<dd className="text-gray-700 dark:text-gray-300 mt-1">
								Unplug the cable, lock and unlock the phone, plug it back in. If it persists,
								restart the phone.
							</dd>
						</div>
						<div>
							<dt className="font-semibold text-gray-900 dark:text-white">WaSaver install is blocked</dt>
							<dd className="text-gray-700 dark:text-gray-300 mt-1">
								Enable <em>Install unknown apps</em> for the browser or file manager you used
								to download the APK, or enable <em>Install via USB</em> under Developer options.
							</dd>
						</div>
						<div>
							<dt className="font-semibold text-gray-900 dark:text-white">Export stops mid-way</dt>
							<dd className="text-gray-700 dark:text-gray-300 mt-1">
								The phone screen probably timed out or you touched WhatsApp. Set the screen
								timeout to <em>Never</em> (or 30&nbsp;minutes), leave WhatsApp open on the chats
								list, and re-run — Tellic resumes from where it left off.
							</dd>
						</div>
						<div>
							<dt className="font-semibold text-gray-900 dark:text-white">Where do my exports go?</dt>
							<dd className="text-gray-700 dark:text-gray-300 mt-1">
								Inside <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">{DATA_FOLDER_PATH}</code>
								(see Step 8). Safe to back up or delete — Tellic will recreate what it needs.
							</dd>
						</div>
					</dl>
				)}
			</article>
		</div>
	);
}

export default TutorialPage;
