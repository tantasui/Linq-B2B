/**
 * A Nigerian mobile number in one form, +2348031234567, however it was typed
 * (0803 123 4567, 2348031234567, +234 803 123 4567, even +234 0803...). The
 * same rule as fieldsales.NormalizePhone in Linq-v2, so a merchant's phone and
 * a field agent's lead compare equal. null for anything else.
 */
export function normalizeNigerianPhone(raw: string): string | null {
  let digits = "";
  for (const [i, ch] of [...raw.trim()].entries()) {
    if (ch >= "0" && ch <= "9") digits += ch;
    else if (!((ch === "+" && i === 0) || " -().".includes(ch))) return null;
  }
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  else if (digits.length === 13 && digits.startsWith("234"))
    digits = digits.slice(3);
  else if (digits.length === 14 && digits.startsWith("2340"))
    digits = digits.slice(4);
  else if (digits.length !== 10) return null;
  // Nigerian mobile numbers start 70, 80, 81, 90, 91 and so on.
  if (digits[0] < "7" || digits[0] > "9") return null;
  return `+234${digits}`;
}
