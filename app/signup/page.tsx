"use client";

import { FormEvent, useMemo, useState } from "react";
import { signUp } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { configureAmplify } from "@/lib/amplify";
import { normalizeEmail } from "@/lib/auth-flow";
import { savePendingSignupState } from "@/lib/pending-signup";

configureAmplify();

export default function SignupPage() {
const router = useRouter();
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

const passwordMismatch = useMemo(() => {
return confirmPassword.length > 0 && password !== confirmPassword;
}, [password, confirmPassword]);

async function handleSubmit(e: FormEvent<HTMLFormElement>) {
e.preventDefault();

console.log("signup submit fired");

setError("");
setSuccess("");

if (!name.trim()) {
setError("Please enter your name.");
return;
}

if (!email.trim()) {
setError("Please enter your email.");
return;
}

if (!password) {
setError("Please enter a password.");
return;
}

if (password !== confirmPassword) {
setError("Passwords do not match.");
return;
}

setLoading(true);

try {
const normalizedEmail = normalizeEmail(email);
const trimmedName = name.trim();

console.log("before signUp", {
email: normalizedEmail,
name: trimmedName,
});

const result = await signUp({
username: normalizedEmail,
password,
options: {
userAttributes: {
email: normalizedEmail,
name: trimmedName,
},
autoSignIn: true,
},
});

console.log("signUp result", result);

savePendingSignupState({
email: normalizedEmail,
password,
name: trimmedName,
});

const target = `/signup/confirm?email=${encodeURIComponent(normalizedEmail)}`;

console.log("redirecting to", target);
setSuccess("Account created. Redirecting to verification...");

router.replace(target);

setTimeout(() => {
if (window.location.pathname === "/signup") {
console.log("router.replace did not move page, forcing hard redirect");
window.location.href = target;
}
}, 300);
} catch (err) {
console.error("signup failed", err);
const message =
err instanceof Error ? err.message : "Something went wrong during sign up.";
setError(message);
} finally {
setLoading(false);
}
}

return (
<main className="min-h-[100svh] bg-[radial-gradient(circle_at_top,_rgba(255,246,196,0.9),_rgba(255,251,240,1)_45%,_rgba(255,248,235,1)_100%)] px-4 py-6 text-stone-900 sm:px-6 sm:py-12">
<div className="mx-auto max-w-md">
<div className="rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-[0_24px_90px_rgba(103,76,18,0.08)] backdrop-blur-sm sm:rounded-[2rem] sm:p-8">
<div className="mb-8">
<p className="text-sm font-medium uppercase tracking-[0.22em] text-stone-500">
Step 1
</p>
<h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">
Create your account
</h1>
<p className="mt-3 text-sm leading-6 text-stone-600">
Start your household setup. We’ll connect Kin to Telegram right after this.
</p>
</div>

<form onSubmit={handleSubmit} className="space-y-5">
<div>
<label className="mb-2 block text-sm font-medium text-stone-700">
Full name
</label>
<input
type="text"
value={name}
onChange={(e) => setName(e.target.value)}
className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-stone-500 sm:text-sm"
placeholder="Daniel Cheung"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium text-stone-700">
Email
</label>
<input
type="email"
value={email}
onChange={(e) => setEmail(e.target.value)}
className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-stone-500 sm:text-sm"
placeholder="you@example.com"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium text-stone-700">
Password
</label>
<input
type="password"
value={password}
onChange={(e) => setPassword(e.target.value)}
className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base outline-none transition focus:border-stone-500 sm:text-sm"
placeholder="Create a password"
/>
</div>

<div>
<label className="mb-2 block text-sm font-medium text-stone-700">
Confirm password
</label>
<input
type="password"
value={confirmPassword}
onChange={(e) => setConfirmPassword(e.target.value)}
className={`w-full rounded-2xl border bg-white px-4 py-3 text-base outline-none transition sm:text-sm ${
passwordMismatch
? "border-red-400 focus:border-red-500"
: "border-stone-300 focus:border-stone-500"
}`}
placeholder="Confirm your password"
/>
{passwordMismatch ? (
<p className="mt-2 text-xs text-red-600">Passwords do not match.</p>
) : null}
</div>

{error ? (
<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
{error}
</div>
) : null}

{success ? (
<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
{success}
</div>
) : null}

<button
type="submit"
disabled={loading || passwordMismatch}
className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
>
{loading ? "Creating account..." : "Create account"}
</button>
</form>
</div>
</div>
</main>
);
}
