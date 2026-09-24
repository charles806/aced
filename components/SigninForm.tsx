"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { login } from "@/app/actions/auth";
import { AuthAside } from "./AuthAside";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string) {
  return EMAIL_RE.test(value.trim())
    ? undefined
    : "Enter a valid email address.";
}

function validatePassword(value: string) {
  return value.length > 0 ? undefined : "Please enter your password.";
}

const baseInputClasses =
  "w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-4";
const validInputClasses =
  "border-zinc-200 focus:border-accent-400 focus:ring-accent-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-accent-400 dark:focus:ring-accent-500/20";
const invalidInputClasses =
  "border-red-300 focus:border-red-400 focus:ring-red-500/10 dark:border-red-400/50 dark:focus:border-red-400 dark:focus:ring-red-500/20";

const labelClasses =
  "mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200";

const errorClasses = "mt-1.5 text-xs text-red-600 dark:text-red-400";

export default function SigninForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>(
    {
      email: false,
      password: false,
    },
  );
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: "email" | "password", value: string) => {
    if (field === "email") setEmail(value);
    else setPassword(value);
    if (touched[field]) {
      const next =
        field === "email" ? validateEmail(value) : validatePassword(value);
      setErrors((current) => ({ ...current, [field]: next }));
    }
  };

  const handleBlur = (field: "email" | "password", value: string) => {
    setTouched((current) => ({ ...current, [field]: true }));
    const next =
      field === "email" ? validateEmail(value) : validatePassword(value);
    setErrors((current) => ({ ...current, [field]: next }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    setTouched({ email: true, password: true });

    if (nextErrors.email || nextErrors.password) return;

    setSubmitting(true);

    try {
      const result = await login({ email, password });
      router.push("/dashboard");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 lg:grid lg:grid-cols-[1.05fr_1fr] lg:bg-zinc-50 dark:bg-zinc-950">
      <AuthAside />

      <main className="order-first flex flex-1 items-center justify-center px-4 py-12 sm:px-8 lg:order-none">
        <div className="w-full max-w-md">
          <h1 className="font-display text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Log in to pick up where you left off.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            {formError && (
              <div
                role="alert"
                className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {formError}
              </div>
            )}

            <div>
              <label htmlFor="email" className={labelClasses}>
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ada@aced.app"
                value={email}
                onChange={(event) => handleChange("email", event.target.value)}
                onBlur={(event) => handleBlur("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                className={`${baseInputClasses} ${
                  errors.email ? invalidInputClasses : validInputClasses
                }`}
              />
              {errors.email && (
                <p id="email-error" className={errorClasses}>
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={labelClasses}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(event) =>
                    handleChange("password", event.target.value)
                  }
                  onBlur={(event) => handleBlur("password", event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className={`${baseInputClasses} pr-11 ${
                    errors.password ? invalidInputClasses : validInputClasses
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 transition hover:text-zinc-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/30 dark:hover:text-zinc-300"
                >
                  {showPassword ? (
                    <EyeOff
                      className="h-4.5 w-4.5"
                      aria-hidden="true"
                      strokeWidth={1.8}
                    />
                  ) : (
                    <Eye
                      className="h-4.5 w-4.5"
                      aria-hidden="true"
                      strokeWidth={1.8}
                    />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className={errorClasses}>
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-accent-500/30 transition hover:bg-accent-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Logging in…
                </>
              ) : (
                "Log in"
              )}
            </button>

            <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
              New to Aced?{" "}
              <a
                href="/signup"
                className="font-medium text-accent-600 underline-offset-4 hover:underline dark:text-accent-400"
              >
                Create an account
              </a>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
