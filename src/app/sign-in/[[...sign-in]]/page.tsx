import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <SignIn />
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <Link href="/privacy" className="hover:text-gray-700 transition-colors">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-gray-700 transition-colors">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
