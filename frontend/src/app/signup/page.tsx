"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Zap } from "lucide-react";
import { signUpWithEmail, signInWithGoogle } from "@/lib/auth";

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
);

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const fullName = form.get("fullName") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const { data, error } = await signUpWithEmail(email, password, fullName);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled in Supabase, session is returned immediately
    if (data.session) {
      router.push("/dashboard");
    } else {
      // Email confirmation required
      router.push("/signup/confirm?email=" + encodeURIComponent(email));
    }
  }

  async function handleGoogle() {
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw] bg-[#030303] text-white">
      {/* Left: form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-8 w-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg">CirrusLabs</span>
          </div>

          <div>
            <h1 className="text-4xl font-semibold leading-tight">Create account</h1>
            <p className="mt-2 text-neutral-400">Start building your signal-driven pipeline</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-neutral-400">Full Name</label>
              <GlassInputWrapper>
                <input
                  name="fullName"
                  type="text"
                  required
                  placeholder="John Smith"
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                />
              </GlassInputWrapper>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-400">Email Address</label>
              <GlassInputWrapper>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="john@company.com"
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                />
              </GlassInputWrapper>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-400">Password</label>
              <GlassInputWrapper>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="At least 8 characters"
                    className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 flex items-center"
                  >
                    {showPassword
                      ? <EyeOff className="w-5 h-5 text-neutral-400 hover:text-white transition-colors" />
                      : <Eye className="w-5 h-5 text-neutral-400 hover:text-white transition-colors" />
                    }
                  </button>
                </div>
              </GlassInputWrapper>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-indigo-600 py-4 font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="relative flex items-center justify-center">
            <span className="w-full border-t border-white/10" />
            <span className="px-4 text-sm text-neutral-500 bg-[#030303] absolute">Or continue with</span>
          </div>

          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 border border-white/10 rounded-2xl py-4 hover:bg-white/5 transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <a href="/login" className="text-violet-400 hover:underline transition-colors">
              Sign In
            </a>
          </p>
        </div>
      </section>

      {/* Right: visual panel */}
      <section className="hidden md:flex flex-1 relative p-4">
        <div
          className="absolute inset-4 rounded-3xl bg-cover bg-center"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80)" }}
        />
        <div className="absolute inset-4 rounded-3xl bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <p className="text-2xl font-semibold leading-snug">
            "Signal-driven outreach that actually converts."
          </p>
          <p className="mt-3 text-white/60">Join teams using CirrusLabs to find and close engineering clients faster.</p>
        </div>
      </section>
    </div>
  );
}
