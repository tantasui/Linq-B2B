"use client";

import { useEffect, useState } from "react";
import { Bell, Building2, ImagePlus, LogOut, Moon, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { MerchantAvatar, merchantLogoChangedEvent, merchantLogoStorageKey } from "@/components/MerchantAvatar";
import { MerchantOnboarding } from "@/components/onboarding/MerchantOnboarding";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { getMerchantMe } from "@/lib/api-client";
import { getBankLogo } from "@/lib/banks";
import { formatWalletLabel, shortAddress } from "@/lib/wallets";
import type { MerchantRecord } from "@/server/types";
import { SegmentedBar } from "@/components/brand/SegmentedBar";
import { NetworkLogo } from "@/components/icons/NetworkLogos";
import { ENABLED_CHAINS } from "@/lib/chains";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy";
import { Switch } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { AddButton } from "@/components/ui/stepper";
import { TabBar } from "@/components/ui/tab-bar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";

/** The onboarding milestones a merchant moves through, in order. */
const KYC_STEPS = ["started", "bank_verified", "wallet_synced", "complete"] as const;

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-accent-text" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const dynamic = useDynamicBridge();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [switches, setSwitches] = useState({ notifications: true, verification: true, biometric: false });
  const [logoVersion, setLogoVersion] = useState(0);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeWallet, setActiveWallet] = useState("");

  const verifiedBank = merchant?.bankAccounts.find((bank) => bank.verificationStatus === "verified");
  const verifiedBankLogo = getBankLogo(verifiedBank?.institutionCode, verifiedBank?.institutionName);
  const kycStep = merchant ? KYC_STEPS.indexOf(merchant.onboardingStatus) + 1 : 0;
  const wallets = merchant?.wallets ?? [];
  // Derived from chain config so it cannot drift as tokens are added.
  const acceptedTokens = Array.from(new Set(ENABLED_CHAINS.flatMap((chain) => chain.tokens)));
  const currentWallet = wallets.find((wallet) => wallet.id === activeWallet) ?? wallets[0];

  useEffect(() => {
    getMerchantMe()
      .then((data) => {
        setMerchant(data.merchant);
        if (data.merchant?.wallets?.[0]) setActiveWallet(data.merchant.wallets[0].id);
      })
      .catch(() => setMerchant(null))
      .finally(() => setLoading(false));
  }, []);

  const notifyLogoChanged = () => {
    setLogoVersion((current) => current + 1);
    window.dispatchEvent(new Event(merchantLogoChangedEvent));
  };

  const uploadLogo = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      window.localStorage.setItem(merchantLogoStorageKey, reader.result);
      notifyLogoChanged();
      toast("Logo updated");
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    window.localStorage.removeItem(merchantLogoStorageKey);
    notifyLogoChanged();
    toast("Logo removed");
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-micro uppercase tracking-[0.16em] text-accent-text">Settings</p>
        <h1 className="mt-2 text-hero font-semibold">Business</h1>
      </header>

      {loading ? (
        <Card className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : !merchant ? (
        <MerchantOnboarding />
      ) : null}

      {merchant ? (
        <>
          {/* Compliance progress uses the brand's segmented bar, not a percentage. */}
          <Section icon={ShieldCheck} title="Verification">
            <SegmentedBar
              value={kycStep}
              segments={KYC_STEPS.length}
              label={
                merchant.onboardingStatus === "complete"
                  ? "Verified — you can accept payments"
                  : `Step ${kycStep} of ${KYC_STEPS.length} · ${merchant.onboardingStatus.replace(/_/g, " ")}`
              }
            />
          </Section>

          <Section icon={Building2} title="Merchant identity">
            <div className="flex items-center gap-3.5 border-b border-line pb-5">
              <MerchantAvatar key={logoVersion} className="h-12 w-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{merchant.businessName}</p>
                <p className="truncate text-xs text-text-muted">{merchant.businessEmail}</p>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-surface text-xs font-medium text-text ring-1 ring-line transition duration-fast ease-linq hover:shadow-md active:scale-[0.98]">
                <ImagePlus className="h-4 w-4" />
                Upload logo
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => uploadLogo(event.target.files?.[0])}
                />
              </label>
              <Button variant="secondary" size="icon" className="h-11 w-11" aria-label="Remove logo" onClick={removeLogo}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {merchant.location ? (
              <p className="mt-4 text-sm text-text-muted">{merchant.location}</p>
            ) : null}
          </Section>

          <Section icon={Wallet} title="Naira payout account">
            {verifiedBank ? (
              <div className="flex items-center gap-3.5">
                {verifiedBankLogo ? (
                  <img
                    src={verifiedBankLogo}
                    alt=""
                    loading="eager"
                    decoding="async"
                    className="h-11 w-11 rounded-md bg-white object-contain ring-1 ring-line"
                  />
                ) : (
                  <span className="h-11 w-11 rounded-md bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{verifiedBank.resolvedAccountName}</p>
                  <p className="tnum mt-0.5 truncate text-xs text-text-muted">
                    {verifiedBank.accountIdentifier} ·{" "}
                    {verifiedBank.institutionName ?? verifiedBank.institutionCode}
                  </p>
                </div>
                <CopyButton value={verifiedBank.accountIdentifier} label="Account number" />
              </div>
            ) : (
              <p className="text-sm text-text-muted">No verified payout account yet.</p>
            )}
          </Section>

          {/* Multi-wallet switching uses the tab pattern from the component set. */}
          <Section
            icon={Wallet}
            title="Receiving wallets"
            action={
              <AddButton
                label="Add a receiving wallet"
                stacked
                className="scale-75"
                onClick={() => toast("Connect another wallet from your Dynamic account", "info")}
              />
            }
          >
            {wallets.length ? (
              <>
                <TabBar
                  tabs={wallets.map((wallet) => ({
                    id: wallet.id,
                    label: formatWalletLabel(wallet),
                    adornment: <NetworkLogo network={wallet.network} size={18} />,
                  }))}
                  activeId={currentWallet?.id ?? ""}
                  onSelect={setActiveWallet}
                />
                {currentWallet ? (
                  <div className="mt-4 flex items-center gap-2 rounded-md bg-surface-2 py-1 pl-4 pr-1">
                    <code className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">
                      {shortAddress(currentWallet.address)}
                    </code>
                    <CopyButton value={currentWallet.address} label="Wallet address" />
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-text-muted">No wallet connected yet.</p>
            )}

            <dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Settlement currency</dt>
                <dd className="font-medium">NGN</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-muted">Accepted</dt>
                <dd className="text-right font-medium">{acceptedTokens.join(" · ")}</dd>
              </div>
            </dl>
          </Section>

          <Section
            icon={Moon}
            title="Appearance"
            action={<ThemeToggle />}
          >
            <p className="text-sm text-text-muted">
              Currently using {theme} mode. Receipts you share export in whichever mode you are in.
            </p>
          </Section>

          <Section icon={Bell} title="Notifications & security">
            <div className="divide-y divide-line">
              {[
                { key: "notifications" as const, label: "Payment notifications" },
                { key: "verification" as const, label: "Confirm large payments" },
                { key: "biometric" as const, label: "Biometric unlock" },
              ].map((entry) => (
                <div key={entry.key} className="flex items-center gap-4 py-4 text-sm first:pt-0 last:pb-0">
                  <span className="flex-1">{entry.label}</span>
                  <Switch
                    checked={switches[entry.key]}
                    label={entry.label}
                    onChange={(next) =>
                      setSwitches((current) => ({ ...current, [entry.key]: next }))
                    }
                  />
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : null}

      <Button variant="danger" size="lg" className="w-full" onClick={dynamic.disconnect}>
        <LogOut className="h-4 w-4" /> Log out
      </Button>
    </div>
  );
}
