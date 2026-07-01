import { WalletPanel } from "@/components/wallet-panel";

export const metadata = {
  title: "Wallet",
};

export default function WalletPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="heading-2 mb-1">Wallet</h1>
        <p className="text-text-muted">
          Your Arc wallet for tipping agents and receiving refunds.
        </p>
      </header>
      <WalletPanel />
    </div>
  );
}