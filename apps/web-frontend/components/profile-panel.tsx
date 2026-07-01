"use client";

import { Mail, Calendar, Wallet, Copy, Check, Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";

const MAX_AVATAR_BYTES = 200 * 1024; // 200 KB

export function ProfilePanel() {
  const { user, status, saveAvatar, updateUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  if (status !== "authenticated" || !user) return null;

  async function handleCopy() {
    if (!user?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file (PNG, JPG, GIF, WebP)");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setUploadError(`Avatar is too large (max ${Math.round(MAX_AVATAR_BYTES / 1024)} KB)`);
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 data URI — keeps backend simple, no file hosting needed.
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      await saveAvatar(dataUri, displayName.trim() || undefined);
      setUploadError(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not save avatar");
    } finally {
      setUploading(false);
      // Clear the input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSaveName() {
    if (!user) return;
    if ((displayName.trim() || null) === user?.displayName) {
      // No change
      return;
    }
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    try {
      // Save the display name by re-uploading the current avatar (or empty).
      // Backend accepts displayName with avatar; if no avatar to save, we go through a different path.
      if (user.avatarUrl) {
        await saveAvatar(user.avatarUrl, displayName.trim() || undefined);
      } else {
        // Use a tiny default data URI as a placeholder when no avatar exists yet.
        const placeholder =
          "data:image/svg+xml;base64," +
          btoa(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="transparent"/></svg>`
          );
        await saveAvatar(placeholder, displayName.trim() || undefined);
      }
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2500);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingName(false);
    }
  }

  const avatar = user.avatarUrl;

  return (
    <div className="space-y-6">
      {/* Identity + avatar card */}
      <div className="card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
          {/* Avatar with upload overlay */}
          <div className="relative shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={user.displayName ?? user.email}
                className="w-24 h-24 rounded-2xl object-cover ring-2 ring-primary/30 shadow-glow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl shadow-glow-md">
                {(user.displayName ?? user.email).slice(0, 1).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full bg-bg-elevated border border-border hover:border-primary/50 flex items-center justify-center text-text-muted hover:text-primary shadow-md transition-all"
              aria-label="Upload avatar"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-1">
              {user.displayName ?? user.email.split("@")[0]}
            </h2>
            <p className="text-text-muted text-sm flex items-center gap-1.5 mb-1">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </p>
            <p className="text-text-dim text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Joined {formatDate(user.createdAt)}
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="mt-3 text-xs text-primary hover:text-primary-300 transition-colors inline-flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" />
              {avatar ? "Change avatar" : "Upload avatar"}
            </button>
            {uploadError && (
              <p className="mt-2 text-xs text-danger">{uploadError}</p>
            )}
          </div>
        </div>

        <div className="divider my-6" />

        <dl className="space-y-5 text-sm">
          <Row label="Email">
            <span className="font-mono">{user.email}</span>
          </Row>

          {/* Editable display name */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <dt className="text-text-dim text-xs uppercase tracking-wider font-semibold sm:w-40 shrink-0">
              Display name
            </dt>
            <dd className="text-text flex-1 flex items-center gap-2">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                maxLength={60}
                className="input flex-1"
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || (displayName.trim() || null) === user.displayName}
                className="btn-primary"
              >
                {savingName ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : nameSaved ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  "Save"
                )}
              </button>
            </dd>
          </div>
          {nameError && (
            <p className="text-xs text-danger sm:pl-44">{nameError}</p>
          )}

          <Row label="Wallet address">
            {user.walletAddress ? (
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs">{user.walletAddress}</code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-bg-elevated hover:bg-bg-subtle text-text-muted hover:text-text transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <span className="text-text-dim italic flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Not yet — generate one from{" "}
                <a href="/dashboard/wallet" className="text-primary hover:underline">
                  Wallet
                </a>
              </span>
            )}
          </Row>
        </dl>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <dt className="text-text-dim text-xs uppercase tracking-wider font-semibold sm:w-40 shrink-0">
        {label}
      </dt>
      <dd className="text-text flex-1 min-w-0">{children}</dd>
    </div>
  );
}