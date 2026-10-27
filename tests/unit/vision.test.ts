import { describe, expect, it } from "vitest";
import type { ModelCall } from "@/lib/tutor/model";
import { readWorking } from "@/lib/tutor/vision";

const reply = (text: string): ModelCall => async () => ({ text, usage: { model: "vision", promptTokens: 0, cachedTokens: 0, completionTokens: 0, ms: 0 } });
const img = "data:image/jpeg;base64,AAAA";

describe("readWorking", () => {
  it("returns the transcription as written", async () => {
    expect(await readWorking(reply("3x - 4 = 2x + 5\nx = 9"), img)).toEqual({ ok: true, text: "3x - 4 = 2x + 5\nx = 9" });
  });
  it("refuses photos that are not school work", async () => {
    expect(await readWorking(reply("NOT_SCHOOLWORK"), img)).toEqual({ ok: false, reason: "not_schoolwork" });
  });
  it("reports unreadable photos", async () => {
    expect(await readWorking(reply("UNREADABLE"), img)).toEqual({ ok: false, reason: "unreadable" });
    expect(await readWorking(reply(""), img)).toEqual({ ok: false, reason: "unreadable" });
  });
  it("strips code fences the model sometimes adds", async () => {
    expect(await readWorking(reply("```\nx = 17\n```"), img)).toEqual({ ok: true, text: "x = 17" });
  });
});
