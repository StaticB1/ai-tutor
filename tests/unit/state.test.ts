import { describe, expect, it } from "vitest";
import { newState, open, seal } from "@/lib/tutor/state";

describe("signed state", () => {
  it("round-trips", () => {
    const s = newState("maths-linear-equation");
    expect(open(seal(s))).toEqual(s);
  });
  it("rejects a tampered body", () => {
    const token = seal(newState("x"));
    const [body, sig] = token.split(".");
    const forged = JSON.parse(Buffer.from(body, "base64url").toString());
    forged.met = ["A1"];
    forged.done = true;
    expect(open(`${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${sig}`)).toBeNull();
  });
  it("rejects junk", () => {
    expect(open("nonsense")).toBeNull();
  });
});
