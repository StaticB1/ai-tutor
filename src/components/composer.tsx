"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./icons";

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

export interface ComposerHandle {
  focus: () => void;
  setText: (t: string) => void;
}

interface Props {
  busy: boolean;
  disabled?: boolean;
  quickReplies: string[];
  showKeypadByDefault: boolean;
  onSend: (text: string) => void;
  maxLength: number;
}

export const Composer = forwardRef<ComposerHandle, Props>(function Composer({ busy, disabled, quickReplies, showKeypadByDefault, onSend, maxLength }, ref) {
  const [text, setText] = useState("");
  const [keypad, setKeypad] = useState(showKeypadByDefault);
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
    <div className="space-y-2">
      {quickReplies.length > 0 && (
        <div className="chip-scroll" role="group" aria-label="Quick replies">
          {quickReplies.map((q) => (
            <button key={q} type="button" className="pill" disabled={busy || disabled} onClick={() => onSend(q)}>
              {q === "I'm stuck" && <Icon.bulb size={14} />}
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
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
          placeholder={disabled ? "You've finished this question" : "Type your working or your answer…"}
          enterKeyHint="send"
          autoComplete="off"
        />
        {keypad && !disabled && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-2" role="group" aria-label="Maths symbols">
            {KEYS.map((k) => (
              <button key={k.label} type="button" className="key" title={k.title} aria-label={`Insert ${k.title}`} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k.insert)}>
                {k.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          <div className="flex items-center gap-1">
            <button type="button" className="icon-btn" aria-label={keypad ? "Hide maths symbols" : "Show maths symbols"} aria-pressed={keypad} onClick={() => setKeypad((k) => !k)} disabled={disabled}>
              <Icon.keypad size={18} />
            </button>
            <span className="text-xs text-muted hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
          </div>
          <div className="flex items-center gap-2">
            {near && (
              <span className={`text-xs ${text.length >= maxLength ? "text-ink font-semibold" : "text-muted"}`}>
                {text.length}/{maxLength}
              </span>
            )}
            <button type="submit" className="btn btn-sm" disabled={busy || disabled || !text.trim()} aria-label="Send">
              <Icon.send size={16} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
});
