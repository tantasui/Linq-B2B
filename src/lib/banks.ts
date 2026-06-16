import banksPayload from "../../banks.json";
import bankLogoPayload from "../../bank_url.json";

type BankPayload = {
  data?: Array<{ code: string; name: string }>;
};

type BankLogoPayload = {
  data?: Array<{ name: string; code: string; logo?: string | null }>;
};

export type BankOption = {
  code: string;
  name: string;
  logo?: string;
};

const commonLogoByPaycrestCode: Record<string, string> = {
  "044": "https://nigerianbanklogos.xyz/library/accesscorp.svg",
  "063": "https://nigerianbanklogos.xyz/library/accesscorp.svg",
  "070": "https://nigerianbanklogos.xyz/library/fidelity.svg",
  "214": "https://nigerianbanklogos.xyz/library/fcmb.svg",
  "011": "https://nigerianbanklogos.xyz/library/firstholdco.svg",
  "058": "https://nigerianbanklogos.xyz/library/gtco.svg",
  "033": "https://nigerianbanklogos.xyz/library/uba.svg",
  "057": "https://nigerianbanklogos.xyz/library/zenithbank.svg",
  "035": "https://nigerianbanklogos.xyz/library/wemabank.svg",
  "221": "https://nigerianbanklogos.xyz/library/stanbic.svg",
  "232": "https://nigerianbanklogos.xyz/library/sterlingng.svg",
};

function normalizeBankName(value: string) {
  return value
    .toLowerCase()
    .replace(/microfinance|mfb|bank|plc|limited|ltd|nigeria|of|for|and|&|\(|\)|-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const logoEntries = ((bankLogoPayload as BankLogoPayload).data ?? []).filter((entry) => entry.logo);

function findLogo(code: string, name: string) {
  if (commonLogoByPaycrestCode[code]) return commonLogoByPaycrestCode[code];
  const normalized = normalizeBankName(name);
  const match = logoEntries.find((entry) => {
    const logoName = normalizeBankName(entry.name);
    return Boolean(logoName && normalized && (logoName.includes(normalized) || normalized.includes(logoName)));
  });
  return match?.logo ?? undefined;
}

export const nigerianBanks: BankOption[] = ((banksPayload as BankPayload).data ?? [])
  .map((bank) => ({
    code: bank.code.trim(),
    name: bank.name.replace(/^"+/, "").trim(),
    logo: findLogo(bank.code.trim(), bank.name),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function getBankByCode(code?: string) {
  if (!code) return undefined;
  return nigerianBanks.find((bank) => bank.code === code);
}

export function getBankLogo(code?: string, name?: string) {
  return getBankByCode(code)?.logo ?? (name ? findLogo(code ?? "", name) : undefined);
}
