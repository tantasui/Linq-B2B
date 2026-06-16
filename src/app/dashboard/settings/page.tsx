"use client";

import { useEffect, useState } from "react";
import { Bell, Building2, Check, Copy, CreditCard, ImagePlus, LogOut, ShieldCheck, Trash2, Wallet } from "lucide-react";
import { MerchantAvatar, merchantLogoChangedEvent, merchantLogoStorageKey } from "@/components/MerchantAvatar";
import { MerchantOnboarding } from "@/components/onboarding/MerchantOnboarding";
import { useDynamicBridge } from "@/components/providers/DynamicBridgeProvider";
import { getMerchantMe } from "@/lib/api-client";
import { getBankLogo } from "@/lib/banks";
import { formatWalletLabel, shortAddress } from "@/lib/wallets";
import type { MerchantRecord } from "@/server/types";

export default function SettingsPage() {
  const dynamic = useDynamicBridge();
  const [switches, setSwitches] = useState({ notifications: true, verification: true, biometric: false });
  const [logoVersion, setLogoVersion] = useState(0);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [feedback, setFeedback] = useState("");
  const verifiedBank = merchant?.bankAccounts.find((bank) => bank.verificationStatus === "verified");
  const verifiedBankLogo = getBankLogo(verifiedBank?.institutionCode, verifiedBank?.institutionName);

  useEffect(() => {
    getMerchantMe().then((data) => setMerchant(data.merchant)).catch(() => setMerchant(null));
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
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    window.localStorage.removeItem(merchantLogoStorageKey);
    notifyLogoChanged();
  };

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
    setFeedback("Wallet address copied");
    window.setTimeout(() => setFeedback(""), 1600);
  };

  return (
    <div className="space-y-5">
      <div><p className="text-xs uppercase tracking-[0.2em] text-[#a985ff]">Settings</p><h1 className="mt-2 text-3xl font-semibold">Business</h1></div>
      {!merchant && <MerchantOnboarding />}
      <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md">
        <h2 className="mb-5 flex items-center gap-2 font-medium"><Building2 className="h-4 w-4 text-[#a985ff]" /> Merchant identity</h2>
        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
          <MerchantAvatar key={logoVersion} className="h-12 w-12" />
          <div className="min-w-0 flex-1"><p className="font-medium">{merchant?.businessName ?? "No merchant configured"}</p><p className="truncate text-xs text-zinc-500">{merchant?.businessEmail ?? "Complete onboarding to start beta payments"}</p></div>
        </div>
        <div className="mt-4 flex gap-2">
          <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-xs font-medium text-zinc-700 transition duration-200 hover:border-[#8A4FFF] hover:text-[#8A4FFF]">
            <ImagePlus className="h-4 w-4" />
            Upload image
            <input type="file" accept="image/*" className="sr-only" onChange={(event) => uploadLogo(event.target.files?.[0])} />
          </label>
          <button onClick={removeLogo} className="flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-zinc-500 transition duration-200 hover:border-red-200 hover:text-red-500" aria-label="Remove merchant image">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-4 text-sm text-zinc-500">{merchant?.location ?? "Business profile details will appear here after onboarding."}</p>
      </section>
      <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md">
        <h2 className="mb-4 flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4 text-[#a985ff]" /> Naira payout account</h2>
        {verifiedBank ? (
          <div className="flex items-center gap-3">
            {verifiedBankLogo ? <img src={verifiedBankLogo} alt="" loading="eager" decoding="async" className="h-10 w-10 rounded-xl object-contain" /> : <span className="h-10 w-10 rounded-xl bg-zinc-100" />}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{verifiedBank.resolvedAccountName}</p>
              <p className="mt-1 text-sm text-zinc-500">{verifiedBank.accountIdentifier} - {verifiedBank.institutionName ?? verifiedBank.institutionCode}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No verified payout account yet.</p>
        )}
      </section>
      <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md">
        <h2 className="mb-4 flex items-center gap-2 font-medium"><Wallet className="h-4 w-4 text-[#a985ff]" /> Settlement defaults</h2>
        <div className="flex justify-between border-b border-zinc-100 py-3 text-sm"><span className="text-zinc-500">Currency</span><span>NGN</span></div>
        <div className="flex justify-between border-b border-zinc-100 py-3 text-sm"><span className="text-zinc-500">Stablecoin</span><span>USDSUI / USDC (Sui)</span></div>
        <div className="space-y-2 py-3">
          <p className="text-xs text-zinc-500">Saved business wallets</p>
          {merchant?.wallets.length ? (
            merchant.wallets.map((wallet) => (
              <div key={`${wallet.network}-${wallet.address}`} className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium capitalize">{formatWalletLabel(wallet)}</p>
                  <code className="block truncate text-xs text-zinc-500">{shortAddress(wallet.address)}</code>
                </div>
                <button
                  aria-label="Copy wallet address"
                  onClick={() => copyAddress(wallet.address)}
                  className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 transition duration-200 hover:border-[#8A4FFF] hover:text-[#8A4FFF]"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">No wallet saved yet.</p>
          )}
          {feedback && <p className="flex items-center gap-1 text-xs text-emerald-500"><Check className="h-4 w-4" />{feedback}</p>}
        </div>
      </section>
      <section className="rounded-3xl border border-zinc-100 bg-white p-5 shadow-sm transition duration-200 hover:shadow-md">
        <h2 className="mb-3 flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-[#a985ff]" /> Notifications & security</h2>
        {[
          { key: "notifications" as const, label: "Payment notifications", icon: Bell },
          { key: "verification" as const, label: "Confirm large payments", icon: ShieldCheck },
          { key: "biometric" as const, label: "Biometric unlock", icon: Wallet },
        ].map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3 border-t border-zinc-100 py-4 text-sm">
            <Icon className="h-4 w-4 text-zinc-500" /><span className="flex-1">{label}</span>
            <button role="switch" aria-checked={switches[key]} onClick={() => setSwitches((current) => ({ ...current, [key]: !current[key] }))} className={`flex h-6 w-11 items-center rounded-full p-1 transition-all duration-200 ${switches[key] ? "justify-end bg-[#8A4FFF]" : "bg-zinc-200"}`}>
              <span className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200" />
            </button>
          </div>
        ))}
      </section>
      <button
        onClick={dynamic.disconnect}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white text-sm font-medium text-red-500 transition duration-200 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" /> Log out
      </button>
    </div>
  );
}
