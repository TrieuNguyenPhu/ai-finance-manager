"use client";

import { FormEvent, useState } from "react";
import { getProfile, getStoredUserId, Profile, updateProfile } from "@/lib/api";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  PageHeader,
} from "@/components/ui";

export default function ProfilePage() {
  const { data: profile, error: loadError } = useAsyncData(getProfile);
  const [displayName, setDisplayName] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("VND");
  const [locale, setLocale] = useState("en-US");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed the form once the profile arrives (state-from-previous-render pattern).
  const [seededFrom, setSeededFrom] = useState<Profile | null>(null);
  if (profile && profile !== seededFrom) {
    setSeededFrom(profile);
    setDisplayName(profile.displayName ?? "");
    setPreferredCurrency(profile.preferredCurrency);
    setLocale(profile.locale);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateProfile({ displayName, preferredCurrency, locale });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description={`Preferences for subject ${getStoredUserId() ?? profile?.userId ?? "…"}`}
      />

      {loadError ? <Alert tone="error">{loadError}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {saved ? <Alert tone="success">Preferences saved.</Alert> : null}

      <Card className="max-w-md animate-fade-up [animation-delay:60ms]">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Used for defaults across the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Display name">
              {(id) => (
                <Input id={id} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              )}
            </Field>
            <Field label="Preferred currency">
              {(id) => (
                <Input
                  id={id}
                  value={preferredCurrency}
                  onChange={(e) => setPreferredCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                  required
                />
              )}
            </Field>
            <Field label="Locale" hint="BCP 47 tag, e.g. en-US or vi-VN">
              {(id) => (
                <Input id={id} value={locale} onChange={(e) => setLocale(e.target.value)} required />
              )}
            </Field>
            <Button type="submit" loading={saving} className="self-start">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
