import { describe, expect, it } from "vitest";
import { formatMinor, minorToMajorInput, parseMajorToMinor, percentOf } from "./money";

function expectAmount(value: string, currency: string, amountMinor: number) {
  expect(parseMajorToMinor(value, currency)).toEqual({ ok: true, amountMinor });
}

describe("parseMajorToMinor", () => {
  it("parses zero-decimal currencies without floating point arithmetic", () => {
    expectAmount("45000", "VND", 45_000);
    expectAmount("  00042  ", "vnd", 42);
  });

  it("pads supported fractional digits exactly", () => {
    expectAmount("12", "USD", 1_200);
    expectAmount("12.3", "USD", 1_230);
    expectAmount("12.30", "USD", 1_230);
    expectAmount("0.001", "KWD", 1);
  });

  it("supports signed values so callers can apply domain-specific rules", () => {
    expectAmount("-12.34", "USD", -1_234);
  });

  it.each(["1,000", "1e3", "+12", ".50", "12.", "1 000", "--1"])(
    "rejects non-neutral format %s",
    (value) => {
      expect(parseMajorToMinor(value, "USD")).toMatchObject({
        ok: false,
        code: "invalid_format",
      });
    },
  );

  it("rejects fractional digits the currency cannot represent", () => {
    expect(parseMajorToMinor("1.0", "VND")).toMatchObject({
      ok: false,
      code: "fractional_digits",
    });
    expect(parseMajorToMinor("1.001", "USD")).toMatchObject({
      ok: false,
      code: "fractional_digits",
    });
  });

  it("accepts the safe-integer boundary and rejects values beyond it", () => {
    expectAmount("90071992547409.91", "USD", Number.MAX_SAFE_INTEGER);
    expect(parseMajorToMinor("90071992547409.92", "USD")).toMatchObject({
      ok: false,
      code: "unsafe_integer",
    });
    expect(parseMajorToMinor("-90071992547409.92", "USD")).toMatchObject({
      ok: false,
      code: "unsafe_integer",
    });
  });

  it("requires an amount and an explicit 3-letter currency", () => {
    expect(parseMajorToMinor("", "USD")).toMatchObject({ ok: false, code: "required" });
    expect(parseMajorToMinor("12.34", "US")).toMatchObject({
      ok: false,
      code: "invalid_currency",
    });
  });
});

describe("minorToMajorInput", () => {
  it("preserves the currency exponent without floating point formatting", () => {
    expect(minorToMajorInput(45_000, "VND")).toBe("45000");
    expect(minorToMajorInput(450, "USD")).toBe("4.50");
    expect(minorToMajorInput(1, "KWD")).toBe("0.001");
    expect(minorToMajorInput(-1_234, "USD")).toBe("-12.34");
  });

  it("rejects values that cannot be represented safely by the API contract", () => {
    expect(() => minorToMajorInput(Number.MAX_SAFE_INTEGER + 1, "USD")).toThrow(RangeError);
    expect(() => minorToMajorInput(1.5, "USD")).toThrow(RangeError);
    expect(() => minorToMajorInput(100, "US")).toThrow(RangeError);
  });
});

describe("formatMinor", () => {
  it("does not lose the smallest unit at the safe-integer boundary", () => {
    expect(formatMinor(Number.MAX_SAFE_INTEGER, "USD", "en")).toBe(
      "USD\u00a090,071,992,547,409.91",
    );
  });
});

describe("percentOf", () => {
  it("rounds integer ratios exactly and clamps invalid domain values", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(-1, 100)).toBe(0);
    expect(percentOf(100, 0)).toBe(0);
    expect(percentOf(2_000, 100)).toBe(999);
  });

  it("rejects values outside the exact API money contract", () => {
    expect(() => percentOf(1.5, 100)).toThrow(RangeError);
    expect(() => percentOf(Number.MAX_SAFE_INTEGER + 1, 100)).toThrow(RangeError);
  });
});
