"use client";

import { FormEvent, useState } from "react";
import { UserRound } from "lucide-react";
import { getProfile, type Profile, updateProfile } from "@/lib/api";
import { useAsyncData } from "@/hooks/useAsyncData";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  SkeletonRows,
} from "@/components/ui";

function profileSignature(profile: Pick<Profile, "displayName" | "preferredCurrency" | "locale">) {
  return JSON.stringify([
    profile.displayName ?? "",
    profile.preferredCurrency,
    profile.locale,
  ]);
}

export default function ProfilePage() {
  const { data: profile, loading, error: loadError, refresh } = useAsyncData(getProfile);
  const [displayName, setDisplayName] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("VND");
  const [locale, setLocale] = useState("en-US");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [baselineSignature, setBaselineSignature] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  // Seed once per loaded profile. Keeping this in render avoids an extra effect cycle.
  const [seededFrom, setSeededFrom] = useState<Profile | null>(null);
  if (profile && profile !== seededFrom) {
    setSeededFrom(profile);
    setDisplayName(profile.displayName ?? "");
    setPreferredCurrency(profile.preferredCurrency);
    setLocale(profile.locale);
    setBaselineSignature(profileSignature(profile));
    setSavedSignature(null);
    setError(null);
  }

  const currentSignature = profileSignature({ displayName, preferredCurrency, locale });
  const hasUnsavedChanges = baselineSignature !== null && currentSignature !== baselineSignature;
  const saved = savedSignature !== null && currentSignature === savedSignature;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSavedSignature(null);
    setSaving(true);

    try {
      const updatedProfile = await updateProfile({
        displayName: displayName.trim(),
        preferredCurrency: preferredCurrency.trim().toUpperCase(),
        locale: locale.trim(),
      });
      const updatedSignature = profileSignature(updatedProfile);
      setDisplayName(updatedProfile.displayName ?? "");
      setPreferredCurrency(updatedProfile.preferredCurrency);
      setLocale(updatedProfile.locale);
      setBaselineSignature(updatedSignature);
      setSavedSignature(updatedSignature);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Profile save failed");
    } finally {
      setSaving(false);
    }
  }

  const status = saved ? "Saved" : hasUnsavedChanges ? "Unsaved changes" : "Up to date";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profile"
        description="Personal defaults used for currency presentation and regional formatting."
        actions={!loading && profile ? <Badge tone={hasUnsavedChanges ? "accent" : "neutral"}>{status}</Badge> : null}
      />

      {loading ? (
        <div className="max-w-2xl">
          <SkeletonRows rows={3} />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-start gap-3">
          <Alert tone="error">{loadError}</Alert>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Retry profile
          </Button>
        </div>
      ) : !profile ? (
        <EmptyState
          icon={UserRound}
          title="Profile unavailable"
          description="No profile was returned for the authenticated subject."
          action={
            <Button variant="secondary" size="sm" onClick={() => void refresh()}>
              Reload profile
            </Button>
          }
        />
      ) : (
        <div className="flex max-w-2xl flex-col gap-4">
          {error ? <Alert tone="error">{error}</Alert> : null}
          {saved ? <Alert tone="success">Preferences saved.</Alert> : null}

          <Card className="animate-fade-up [animation-delay:60ms]">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Changes affect display defaults only; they never convert ledger balances.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <Field label="Display name" hint="Optional name shown in this app">
                  {(id) => (
                    <Input
                      id={id}
                      value={displayName}
                      onChange={(event) => {
                        setDisplayName(event.target.value);
                        setError(null);
                      }}
                      disabled={saving}
                      autoComplete="name"
                    />
                  )}
                </Field>
                <Field label="Preferred currency" hint="ISO 4217 display default">
                  {(id) => (
                    <Input
                      id={id}
                      value={preferredCurrency}
                      onChange={(event) => {
                        setPreferredCurrency(event.target.value.toUpperCase());
                        setError(null);
                      }}
                      minLength={3}
                      maxLength={3}
                      disabled={saving}
                      required
                    />
                  )}
                </Field>
                <Field label="Locale" hint="BCP 47 tag, e.g. en-US or vi-VN">
                  {(id) => (
                    <Input
                      id={id}
                      value={locale}
                      onChange={(event) => {
                        setLocale(event.target.value);
                        setError(null);
                      }}
                      disabled={saving}
                      required
                    />
                  )}
                </Field>
                <Button
                  type="submit"
                  loading={saving}
                  disabled={!hasUnsavedChanges}
                  className="self-start"
                >
                  Save preferences
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
