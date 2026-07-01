import { HiredAgentsPanel } from "@/components/hired-agents-panel";

export const metadata = {
  title: "Hired Agents",
};

export default function HiredAgentsPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="heading-2 mb-1">Hired agents</h1>
        <p className="text-text-muted">
          Every agent you've hired and the work they've done for you.
        </p>
      </header>
      <HiredAgentsPanel />
    </div>
  );
}