import { describe, expect, it } from "vitest";
import {
  evaluateFormulaValue,
  formatFormulaValue,
  runFormula,
  tryParseFormula,
} from "@/lib/formula";

describe("tryParseFormula", () => {
  it("returns a null ast with no error for an empty expression", () => {
    expect(tryParseFormula("")).toEqual({ ast: null, error: null });
    expect(tryParseFormula("   ")).toEqual({ ast: null, error: null });
  });

  it("returns a parse error for invalid syntax", () => {
    const { ast, error } = tryParseFormula("1 + ");
    expect(ast).toBeNull();
    expect(error).toBeTruthy();
  });
});

describe("evaluateFormulaValue — operators", () => {
  const ctx = { resolveProp: () => null };

  it("respects arithmetic operator precedence", () => {
    expect(evaluateFormulaValue("2 + 3 * 4", ctx)).toEqual({
      value: 14,
      error: null,
    });
    expect(evaluateFormulaValue("(2 + 3) * 4", ctx)).toEqual({
      value: 20,
      error: null,
    });
  });

  it("concatenates when either side of + is a string", () => {
    expect(evaluateFormulaValue('"a" + "b"', ctx)).toEqual({
      value: "ab",
      error: null,
    });
    expect(evaluateFormulaValue('"count: " + 3', ctx)).toEqual({
      value: "count: 3",
      error: null,
    });
  });

  it("errors on division by zero instead of returning Infinity", () => {
    const { value, error } = evaluateFormulaValue("1 / 0", ctx);
    expect(value).toBeNull();
    expect(error).toBe("Division by zero");
  });

  it("short-circuits and/or", () => {
    // A right side that would error (unknown function) must never run once
    // the left side already decides the result.
    expect(evaluateFormulaValue("false and doesNotExist()", ctx)).toEqual({
      value: false,
      error: null,
    });
    expect(evaluateFormulaValue("true or doesNotExist()", ctx)).toEqual({
      value: true,
      error: null,
    });
  });
});

describe("evaluateFormulaValue — prop() and count()", () => {
  it("resolves prop() through the context", () => {
    const ctx = { resolveProp: (name: string) => (name === "Age" ? 30 : null) };
    expect(evaluateFormulaValue('prop("Age") >= 18', ctx)).toEqual({
      value: true,
      error: null,
    });
  });

  it("resolves count() through resolveCount, not resolveProp", () => {
    const ctx = {
      resolveProp: () => null,
      resolveCount: (name: string) => (name === "Upvoted by" ? 5 : 0),
    };
    expect(evaluateFormulaValue('count(prop("Upvoted by"))', ctx)).toEqual({
      value: 5,
      error: null,
    });
  });

  it("errors when count() is used without a resolveCount context", () => {
    const ctx = { resolveProp: () => null };
    const { error } = evaluateFormulaValue('count(prop("X"))', ctx);
    expect(error).toBe("count() isn't available here");
  });
});

describe("evaluateFormulaValue — function calls", () => {
  const ctx = { resolveProp: () => null };

  it("evaluates a built-in math function", () => {
    expect(evaluateFormulaValue("round(4.6)", ctx)).toEqual({
      value: 5,
      error: null,
    });
  });

  it("evaluates a built-in text function", () => {
    expect(evaluateFormulaValue('upper(concat("a", "b"))', ctx)).toEqual({
      value: "AB",
      error: null,
    });
  });

  it("evaluates if() with the false branch", () => {
    expect(evaluateFormulaValue('if(false, "yes", "no")', ctx)).toEqual({
      value: "no",
      error: null,
    });
  });

  it("errors for an unknown function", () => {
    // The parser lowercases identifiers (see lib/formula/parser.ts), so the
    // error message echoes the lowercased name back, not the original casing.
    const { error } = evaluateFormulaValue("notAFunction(1)", ctx);
    expect(error).toBe('Unknown function "notafunction(...)"');
  });
});

describe("formatFormulaValue", () => {
  it("formats booleans as Yes/No", () => {
    expect(formatFormulaValue(true)).toBe("Yes");
    expect(formatFormulaValue(false)).toBe("No");
  });

  it("formats null as an empty string", () => {
    expect(formatFormulaValue(null)).toBe("");
  });

  it("rounds a non-integer number to 2 decimal places for display", () => {
    expect(formatFormulaValue(1 / 3)).toBe("0.33");
    expect(formatFormulaValue(4)).toBe("4");
  });
});

describe("runFormula", () => {
  it("parses, evaluates, and formats an expression in one call", () => {
    const ctx = {
      resolveProp: (name: string) => (name === "Price" ? 19.999 : null),
    };
    expect(runFormula('round(prop("Price"))', ctx)).toEqual({
      display: "20",
      error: null,
    });
  });

  it("surfaces a parse error without evaluating", () => {
    const ctx = { resolveProp: () => null };
    const { display, error } = runFormula("prop(", ctx);
    expect(display).toBeNull();
    expect(error).toBeTruthy();
  });
});
