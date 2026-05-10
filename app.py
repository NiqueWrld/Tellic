import os
import queue
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import ttk


BASE_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = BASE_DIR / "Scripts"
CONTACTS_SCRIPT = SCRIPTS_DIR / "get_contacts.py"
MESSAGES_SCRIPT = SCRIPTS_DIR / "get_messages.py"


class ScriptRunnerApp:
	def __init__(self, root: tk.Tk) -> None:
		self.root = root
		self.root.title("WhatsApp Export Runner")
		self.root.geometry("900x560")

		self.log_queue: queue.Queue[str] = queue.Queue()
		self.running = False

		self._build_ui()
		self.root.after(120, self._flush_log_queue)

	def _build_ui(self) -> None:
		container = ttk.Frame(self.root, padding=12)
		container.pack(fill=tk.BOTH, expand=True)

		button_row = ttk.Frame(container)
		button_row.pack(fill=tk.X, pady=(0, 10))

		self.run_contacts_btn = ttk.Button(
			button_row,
			text="Run Contacts",
			command=lambda: self._run_single(CONTACTS_SCRIPT),
		)
		self.run_contacts_btn.pack(side=tk.LEFT, padx=(0, 8))

		self.run_messages_btn = ttk.Button(
			button_row,
			text="Run Messages",
			command=lambda: self._run_single(MESSAGES_SCRIPT),
		)
		self.run_messages_btn.pack(side=tk.LEFT, padx=(0, 8))

		self.run_all_btn = ttk.Button(button_row, text="Run All", command=self._run_all)
		self.run_all_btn.pack(side=tk.LEFT, padx=(0, 8))

		self.clear_log_btn = ttk.Button(button_row, text="Clear Log", command=self._clear_log)
		self.clear_log_btn.pack(side=tk.LEFT)

		self.status_var = tk.StringVar(value="Ready")
		ttk.Label(container, textvariable=self.status_var).pack(fill=tk.X, pady=(0, 8))

		log_frame = ttk.Frame(container)
		log_frame.pack(fill=tk.BOTH, expand=True)

		self.log_text = tk.Text(log_frame, wrap=tk.WORD, height=22)
		self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

		scrollbar = ttk.Scrollbar(log_frame, orient=tk.VERTICAL, command=self.log_text.yview)
		scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
		self.log_text.configure(yscrollcommand=scrollbar.set)

		self._log(f"Base directory: {BASE_DIR}")
		self._log(f"Python executable: {sys.executable}")

	def _set_running(self, running: bool) -> None:
		self.running = running
		state = tk.DISABLED if running else tk.NORMAL
		self.run_contacts_btn.configure(state=state)
		self.run_messages_btn.configure(state=state)
		self.run_all_btn.configure(state=state)

	def _clear_log(self) -> None:
		self.log_text.delete("1.0", tk.END)

	def _log(self, message: str) -> None:
		self.log_queue.put(message)

	def _flush_log_queue(self) -> None:
		while not self.log_queue.empty():
			line = self.log_queue.get_nowait()
			self.log_text.insert(tk.END, line + "\n")
			self.log_text.see(tk.END)
		self.root.after(120, self._flush_log_queue)

	def _run_single(self, script_path: Path) -> None:
		if self.running:
			return
		threading.Thread(target=self._execute_scripts, args=([script_path],), daemon=True).start()

	def _run_all(self) -> None:
		if self.running:
			return
		threading.Thread(
			target=self._execute_scripts,
			args=([CONTACTS_SCRIPT, MESSAGES_SCRIPT],),
			daemon=True,
		).start()

	def _execute_scripts(self, scripts: list[Path]) -> None:
		self.root.after(0, lambda: self._set_running(True))
		self.root.after(0, lambda: self.status_var.set("Running..."))

		try:
			for script in scripts:
				if not script.exists():
					self._log(f"ERROR: Missing script: {script}")
					break

				self._log("=" * 72)
				self._log(f"Starting: {script.name}")
				self._log("=" * 72)

				command = [sys.executable, str(script)]
				process = subprocess.Popen(
					command,
					cwd=str(BASE_DIR),
					stdout=subprocess.PIPE,
					stderr=subprocess.STDOUT,
					text=True,
					encoding="utf-8",
					errors="replace",
				)

				assert process.stdout is not None
				for line in process.stdout:
					self._log(line.rstrip())

				exit_code = process.wait()
				self._log(f"Finished: {script.name} (exit code {exit_code})")

				if exit_code != 0:
					self._log("Stopped due to script error.")
					break

			self.root.after(0, lambda: self.status_var.set("Done"))
		except Exception as exc:
			self._log(f"Unexpected error: {exc}")
			self.root.after(0, lambda: self.status_var.set("Error"))
		finally:
			self.root.after(0, lambda: self._set_running(False))


def main() -> None:
	os.chdir(BASE_DIR)
	root = tk.Tk()
	app = ScriptRunnerApp(root)
	root.mainloop()


if __name__ == "__main__":
	main()
