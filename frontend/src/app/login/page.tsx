"use client";
import { SignInPage } from "@/components/ui/sign-in";

const testimonials = [
  {
    avatarSrc:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face",
    name: "Marcus Reid",
    handle: "@marcusreid",
    text: "CirrusLabs filled 3 engineering roles in under a month. The signal-based targeting is unlike anything we've used.",
  },
  {
    avatarSrc:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face",
    name: "Priya Shankar",
    handle: "@priyashankar",
    text: "We went from 0 to pipeline in 48 hours. The outreach quality was 10x better than our previous agency.",
  },
  {
    avatarSrc:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    name: "Daniel Torres",
    handle: "@danieltorres",
    text: "Finally, a recruiting partner that actually understands our tech stack and hiring signals.",
  },
];

export default function LoginPage() {
  return (
    <SignInPage
      heroImageSrc="https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80"
      testimonials={testimonials}
      onSignIn={(e) => {
        e.preventDefault();
        window.location.href = "/dashboard";
      }}
      onGoogleSignIn={() => {
        window.location.href = "/dashboard";
      }}
      onResetPassword={() => alert("Password reset email sent.")}
      onCreateAccount={() => alert("Redirecting to sign up...")}
    />
  );
}
