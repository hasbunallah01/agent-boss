import { ProfilePanel } from "@/components/profile-panel";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="heading-2 mb-1">Profile</h1>
        <p className="text-text-muted">
          Your account details from Agent Boss.
        </p>
      </header>
      <ProfilePanel />
    </div>
  );
}