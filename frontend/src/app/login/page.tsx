"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in";
import { signInWithEmail, signInWithGoogle, resetPassword } from "@/lib/auth";

const testimonials = [
  {
    avatarSrc: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face",
    name: "Marcus Reid",
    handle: "@marcusreid",
    text: "CirrusLabs filled 3 engineering roles in under a month. The signal-based targeting is unlike anything we've used.",
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face",
    name: "Priya Shankar",
    handle: "@priyashankar",
    text: "We went from 0 to pipeline in 48 hours. The outreach quality was 10x better than our previous agency.",
  },
  {
    avatarSrc: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "Daniel Torres",
    handle: "@danieltorres",
    text: "Finally, a recruiting partner that actually understands our tech stack and hiring signals.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    const { error } = await signInWithEmail(email, password);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error.message);
  }

  async function handleResetPassword() {
    const email = (document.querySelector('input[name="email"]') as HTMLInputElement)?.value;
    if (!email) {
      setError("Enter your email address first, then click Reset Password.");
      return;
    }
    const { error } = await resetPassword(email);
    if (error) {
      setError(error.message);
    } else {
      setError("");
      alert(`Password reset email sent to ${email}`);
    }
  }

  return (
    <div className="relative">
      <SignInPage
        heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
        testimonials={testimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={() => router.push("/signup")}
        loading={loading}
        error={error}
      />
    </div>
  );
}
