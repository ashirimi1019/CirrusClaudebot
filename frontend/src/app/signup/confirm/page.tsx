"use client";

import { Zap, Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ConfirmContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "your email";

  return (
    <div className="h-[100dvh] flex items-center justify-center bg-[#030303] text-white p-8">
      <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
        <div className="h-16 w-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
          <Mail className="h-8 w-8 text-indigo-400" />
        </div>

        <div>
          <h1 className="text-3xl font-semibold">Check your inbox</h1>
          <p className="mt-3 text-neutral-400">
            We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            Click the link to activate your account.
          </p>
        </div>

        <div className="w-full border border-white/10 rounded-2xl p-5 text-left text-sm text-neutral-400 space-y-2">
          <p>• Check your spam folder if you don't see it</p>
          <p>• The link expires in 24 hours</p>
          <p>• Make sure to use the same browser</p>
        </div>

        <a
          href="/login"
          className="flex items-center gap-2 text-violet-400 hover:underline text-sm"
        >
          Back to sign in
        </a>

        <div className="flex items-center gap-2 text-neutral-600 text-xs">
          <Zap className="h-3.5 w-3.5" />
          CirrusLabs
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
