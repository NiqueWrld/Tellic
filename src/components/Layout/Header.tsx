const APP_NAME = 'WhatsApp Pull Chats';

type Props = {
  onOpenSidebar: () => void;
};

export function Header({ onOpenSidebar }: Props) {
  return (
    <header className="md:hidden px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <a href="#/" className="flex items-center gap-2 md:hidden">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="text-lg font-bold dark:text-white">{APP_NAME}</span>
        </a>
      </div>
      <nav className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="md:hidden p-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          aria-label="Open menu"
        >
          <i className="ph ph-list text-2xl" />
        </button>
      </nav>
    </header>
  );
}
