import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white/90 supports-[backdrop-filter]:bg-white/75 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <img
                src="/dentalmarketing-logo.svg"
                alt="DentalMarketing.com"
                className="h-10 w-auto"
              />
              <div className="h-8 w-px bg-gray-300" aria-hidden />
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                DM Agent Portal
              </span>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              ← Back to Agent Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-8 sm:px-10 sm:py-10">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <span>&copy; {new Date().getFullYear()} DM Agent Portal</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
