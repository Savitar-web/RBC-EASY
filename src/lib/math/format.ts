import Decimal from "decimal.js";

function insertThousands(intStr: string): string {
  const digits = intStr.replace(/\D/g, "") || "0";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function shortenPeriodic(frac: string): string {
  if (frac.length < 8) return frac;
  for (let len = 1; len <= 6; len++) {
    const piece = frac.slice(0, len);
    let reps = 0;
    let pos = 0;
    while (pos + len <= frac.length && frac.slice(pos, pos + len) === piece) {
      reps++;
      pos += len;
    }
    if (reps >= 4 && pos >= frac.length * 0.7) return piece.repeat(4) + "…";
  }
  return frac.length > 48 ? frac.slice(0, 48) + "…" : frac;
}

export function formatDecimal(value: Decimal | number | string): string {
  let d = value instanceof Decimal ? value : new Decimal(value);
  if (!d.isFinite()) return "Error";
  if (d.isZero()) return "0";
  const snapped = d.toDecimalPlaces(12, Decimal.ROUND_HALF_UP);
  if (d.sub(snapped).abs().div(Decimal.max(d.abs(), 1)).lt("1e-11")) {
    d = snapped;
  }
  const exp = d.abs().e;
  if (exp >= 100 || exp <= -80) return d.toExponential(12);

  const fracDigits = exp >= 0 ? Math.min(40, Math.max(0, 28)) : Math.min(48, Math.abs(exp) + 12);
  let plain = d.toFixed(fracDigits);
  if (plain.includes(".")) plain = plain.replace(/\.?0+$/, "");
  const neg = plain.startsWith("-");
  if (neg) plain = plain.slice(1);
  const [ip = "0", fp = ""] = plain.split(".");
  const head = (neg ? "-" : "") + insertThousands(ip);
  return fp ? head + "." + shortenPeriodic(fp) : head;
}

export function stripFormatting(s: string): string {
  return s.replace(/,/g, "").trim();
}
