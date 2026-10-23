"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Icon, type IconName } from "./icons";

const KEYS: { label: string; insert: string; title: string }[] = [
  { label: "+", insert: " + ", title: "plus" },
  { label: "−", insert: " − ", title: "minus" },
  { label: "×", insert: " × ", title: "times" },
  { label: "÷", insert: " ÷ ", title: "divided by" },
  { label: "=", insert: " = ", title: "equals" },
  { label: "(", insert: "(", title: "open bracket" },
  { label: ")", insert: ")", title: "close bracket" },
  { label: "x", insert: "x", title: "x" },
  { label: "x²", insert: "²", title: "squared" },
  { label: "x³", insert: "³", title: "cubed" },
  { label: "√", insert: "√", title: "square root" },
  { label: "π", insert: "π", title: "pi" },
  { label: "a/b", insert: "/", title: "fraction" },
  { label: "%", insert: "%", title: "percent" },
  { label: "°", insert: "°", title: "degrees" },
  { label: "≤", insert: " ≤ ", title: "less than or equal to" },
  { label: "≥", insert: " ≥ ", title: "greater than or equal to" },
  { label: "→", insert: " → ", title: "arrow, gives" },
];

const CHIP_ICONS: Record<string, IconName> = {
  "Give me a hint": "bulb",
  "Check my step": "clipboard",
  "Explain it another way": "refresh",
  "Where do I start?": "flag",
  "Explain the question": "info",
};

export interface ComposerHandle {
  focus: () => void;
  setText: (t: string) => void;
}

interface Props {
  busy: boolean;
  disabled?: boolean;
  quickReplies: string[];
  onSend: (text: string) => void;
  maxLength: number;
}

export const Composer = forwardRef<ComposerHandle, Props>(function Composer({ busy, disabled, quickReplies, onSend, maxLength }, ref) {
  const [text, setText] = useState("");
  const [keypad, setKeypad] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const caret = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    focus: () => area.current?.focus(),
    setText: (t: string) => setText(t),
  }));

  // Grow with the text, up to the CSS max-height, and put the caret back after a symbol is inserted.
  // This runs before the browser handles the next key press, so fast typing lands in the right place.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    if (caret.current !== null) {
      el.focus();
      el.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  }, [text]);

  function insert(sym: string) {
    const el = area.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    // no double spaces: " − " after "3x " becomes "3x − "
    const s = before.endsWith(" ") || before === "" ? sym.replace(/^ /, "") : sym;
    const next = before + s + text.slice(end);
    if (next.length > maxLength) return;
    caret.current = start + s.length;
    setText(next);
  }

  function submit() {
    const t = text.trim();
    if (!t || busy || disabled) return;
    onSend(t);
    setText("");
  }

  const near = text.length > maxLength * 0.8;

  return (
    <div className="space-y-3">
      {quickReplies.length > 0 && (
        <div className="grid grid-cols-2 sm:flex gap-2" role="group" aria-label="Quick replies">
          {quickReplies.map((q, n) => {
            const I = Icon[CHIP_ICONS[q] ?? "bulb"];
            return (
              <button key={q} type="button" className={`chip justify-center sm:flex-1 px-3! sm:px-4! text-[0.82rem]! sm:text-[0.95rem]! ${n > 1 ? "hidden sm:inline-flex" : ""}`} disabled={busy || disabled} onClick={() => onSend(q)}>
                <I size={19} />
                {q}
              </button>
            );
          })}
        </div>
      )}

      <form
        className="flex items-end gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="composer flex-1 min-w-0">
          <div className="flex items-end">
            <label htmlFor="msg" className="sr-only">
              Your answer or question
            </label>
            <textarea
              id="msg"
              ref={area}
              rows={1}
              value={text}
              maxLength={maxLength}
              disabled={disabled}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={disabled ? "You've finished this question" : "Type your working or answer…"}
              enterKeyHint="send"
              autoComplete="off"
              className="text-base px-4! sm:px-5!"
            />
            <button
              type="button"
              className="icon-btn m-1.5 shrink-0 border! border-line! w-9! h-9! sm:w-10! sm:h-10!"
              aria-label={keypad ? "Hide maths symbols" : "Show maths symbols"}
              aria-pressed={keypad}
              title="Maths symbols"
              onClick={() => setKeypad((k) => !k)}
              disabled={disabled}
            >
              <Icon.keypad size={18} />
            </button>
          </div>
          {keypad && !disabled && (
            <div className="flex flex-wrap gap-1.5 px-3 pb-3" role="group" aria-label="Maths symbols">
              {KEYS.map((k) => (
                <button key={k.label} type="button" className="key" title={k.title} aria-label={`Insert ${k.title}`} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k.insert)}>
                  {k.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="btn h-[3.5rem] w-[3.5rem] px-0! sm:w-auto sm:px-7! shrink-0" disabled={busy || disabled || !text.trim()} aria-label="Send">
          <span className="hidden sm:inline">Send</span>
          <Icon.send size={18} className="sm:hidden" />
        </button>
      </form>
      <p className="text-xs text-muted flex flex-wrap justify-between gap-x-4 gap-y-1 px-1">
        <span>You are talking to an AI. It can make mistakes.</span>
        {near ? (
          <span className={text.length >= maxLength ? "text-ink font-semibold" : ""}>
            {text.length}/{maxLength}
          </span>
        ) : null}
      </p>
    </div>
  );
});
