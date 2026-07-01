import { SettingsPanel } from "@/components/settings-panel";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="heading-2 mb-1">Settings</h1>
        <p className="text-text-muted">Account preferences and security.</p>
      </header>
      <SettingsPanel />
    </div>
  );
}