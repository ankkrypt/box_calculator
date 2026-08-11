"use client";

import { useMemo, useState } from "react";

import {
  ALLOWANCES,
  COATINGS,
  ONE_TIME_COST_FIELDS,
  PAPER_COSTS,
  PLY_GSM,
  PRINTING_OPTIONS,
  QUANTITY_PRESETS,
} from "@/lib/calculator/constants";
import { BOX_TYPES, DEFAULT_BOX_TYPE } from "@/lib/calculator/boxTypes";
import {
  calculateQuote,
  isValidQuote,
  markupTierForQuantity,
} from "@/lib/calculator/calculator";
import { formatINR, formatNumber } from "@/lib/calculator/format";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const inputBase =
  "w-full rounded-xl border bg-white px-3 py-2 text-sm text-stone-900 shadow-sm outline-none transition-colors focus:ring-2 " +
  "border-stone-300 hover:border-stone-400 focus:border-amber-500 focus:ring-amber-500/30 " +
  "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:border-zinc-600";

const PLY_OPTIONS = Object.entries(PLY_GSM).map(([value, gsm]) => ({
  value,
  label: `${value} ply`,
  gsm,
}));

const COLOUR_OPTIONS = Object.entries(PAPER_COSTS).map(([value, grade]) => ({
  value,
  label: grade.label,
  grade,
}));

/* ------------------------------ small pieces ------------------------------ */

function Section({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-zinc-100">
          <span className="h-2 w-2 rounded-full bg-amber-600" aria-hidden />
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-stone-600 dark:text-zinc-300">
        <span>{label}</span>
        {hint && (
          <span className="font-normal text-stone-400 dark:text-zinc-500">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function NumberInput({ value, onChange, min = 0, suffix, prefix, placeholder, className = "" }) {
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-stone-400 dark:text-zinc-500">
          {prefix}
        </span>
      )}
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} ${suffix ? "pr-12" : prefix ? "pl-7" : ""} ${className}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-stone-400 dark:text-zinc-500">
          {suffix}
        </span>
      )}
    </div>
  );
}

function Slider({ value, min, max, onChange }) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-600 dark:bg-zinc-700"
    />
  );
}

function Segmented({ options, value, onChange, render }) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={
              "rounded-xl border px-2 py-2 text-xs font-medium transition-all " +
              (selected
                ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-600 dark:border-amber-500 dark:bg-amber-500/15 dark:text-amber-300"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700")
            }
          >
            {render ? render(opt, selected) : opt.label}
          </button>
        );
      })}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} cursor-pointer appearance-none pr-9`}
        >
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-zinc-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </Field>
  );
}

/* ------------------------------- main form -------------------------------- */

export default function BoxCalculator() {
  const [form, setForm] = useState({
    boxType: DEFAULT_BOX_TYPE,
    length: "300",
    width: "200",
    height: "150",
    ply: "3",
    colour: "brown",
    paperCostPerKg: String(PAPER_COSTS.brown.default),
    jointAllowance: String(ALLOWANCES.joint.default),
    trimAllowance: String(ALLOWANCES.trim.default),
    coating: "none",
    printing: "none",
    quantity: "100",
    oneTimeCosts: {
      logoStamp: "",
      dieMold: "",
      labour: "",
      machineSetup: "",
    },
  });

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setOneTime = (key, value) =>
    setForm((prev) => ({
      ...prev,
      oneTimeCosts: { ...prev.oneTimeCosts, [key]: value },
    }));

  const selectColour = (colour) => {
    setForm((prev) => ({
      ...prev,
      colour,
      paperCostPerKg: String(PAPER_COSTS[colour].default),
    }));
  };

  const quoteInput = useMemo(
    () => ({
      ...form,
      length: toNum(form.length),
      width: toNum(form.width),
      height: toNum(form.height),
      quantity: Math.max(1, Math.round(toNum(form.quantity))),
      paperCostPerKg: toNum(form.paperCostPerKg),
      jointAllowance: toNum(form.jointAllowance),
      trimAllowance: toNum(form.trimAllowance),
      oneTimeCosts: Object.fromEntries(
        Object.entries(form.oneTimeCosts).map(([k, v]) => [k, toNum(v)])
      ),
    }),
    [form]
  );

  const quote = useMemo(
    () => (isValidQuote(quoteInput) ? calculateQuote(quoteInput) : null),
    [quoteInput]
  );

  const paperGrade = PAPER_COSTS[form.colour];
  const activeTier = markupTierForQuantity(quoteInput.quantity);
  const boxType = BOX_TYPES[form.boxType];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
          </svg>
          Corrugated box pricing
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-zinc-50 sm:text-4xl">
          Box Calculator
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500 dark:text-zinc-400 sm:text-base">
          Estimate the cost of corrugated boxes from sheet size to final price —
          with a transparent step-by-step breakdown.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* ------------------------------- inputs ------------------------------- */}
        <div className="space-y-6">
          {/* Box style */}
          <Section
            title="Box style"
            subtitle="RSC is available today; more styles coming soon."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.values(BOX_TYPES).map((type) => {
                const selected = form.boxType === type.id;
                const disabled = type.status !== "available";
                return (
                  <button
                    key={type.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setField("boxType", type.id)}
                    className={
                      "rounded-xl border p-3 text-left transition-all " +
                      (disabled
                        ? "cursor-not-allowed border-dashed border-stone-200 bg-stone-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-800/40"
                        : selected
                          ? "border-amber-600 bg-amber-50 shadow-sm ring-1 ring-amber-600 dark:border-amber-500 dark:bg-amber-500/10"
                          : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={
                          "text-sm font-semibold " +
                          (selected
                            ? "text-amber-900 dark:text-amber-300"
                            : "text-stone-800 dark:text-zinc-100")
                        }
                      >
                        {type.label}
                      </span>
                      {disabled && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:bg-zinc-700 dark:text-zinc-400">
                          Soon
                        </span>
                      )}
                      {selected && !disabled && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-500 dark:text-zinc-400">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Dimensions */}
          <Section
            title="Box dimensions"
            subtitle="Inside measurements of the finished box, in millimetres."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Length" hint="mm">
                <NumberInput value={form.length} onChange={(v) => setField("length", v)} suffix="mm" />
              </Field>
              <Field label="Width" hint="mm">
                <NumberInput value={form.width} onChange={(v) => setField("width", v)} suffix="mm" />
              </Field>
              <Field label="Height" hint="mm">
                <NumberInput value={form.height} onChange={(v) => setField("height", v)} suffix="mm" />
              </Field>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Field
                label={ALLOWANCES.joint.label}
                hint={`${form.jointAllowance} mm`}
              >
                <Slider
                  value={toNum(form.jointAllowance)}
                  min={ALLOWANCES.joint.min}
                  max={ALLOWANCES.joint.max}
                  onChange={(v) => setField("jointAllowance", String(v))}
                />
                <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-zinc-500">
                  <span>{ALLOWANCES.joint.min} mm</span>
                  <span>{ALLOWANCES.joint.max} mm</span>
                </div>
              </Field>
              <Field label={ALLOWANCES.trim.label} hint={`${form.trimAllowance} mm`}>
                <Slider
                  value={toNum(form.trimAllowance)}
                  min={ALLOWANCES.trim.min}
                  max={ALLOWANCES.trim.max}
                  onChange={(v) => setField("trimAllowance", String(v))}
                />
                <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-zinc-500">
                  <span>{ALLOWANCES.trim.min} mm</span>
                  <span>{ALLOWANCES.trim.max} mm</span>
                </div>
              </Field>
            </div>
          </Section>

          {/* Material */}
          <Section
            title="Material"
            subtitle="Board strength, paper grade and surface finishing."
          >
            <Field label="Board ply" hint="GSM per sq m">
              <Segmented
                options={PLY_OPTIONS}
                value={form.ply}
                onChange={(v) => setField("ply", v)}
                render={(opt) => (
                  <span className="block">
                    <span className="block font-semibold">{opt.label}</span>
                    <span className="mt-0.5 block text-[10px] opacity-70">
                      {formatNumber(opt.gsm, 0)} GSM
                    </span>
                  </span>
                )}
              />
            </Field>

            <div className="mt-4">
              <Field label="Paper colour">
                <Segmented
                  options={COLOUR_OPTIONS}
                  value={form.colour}
                  onChange={selectColour}
                  render={(opt, selected) => (
                    <span className="flex items-center justify-center gap-1.5">
                      <span
                        className={
                          "h-3 w-3 rounded-full border " +
                          (opt.value === "brown"
                            ? "border-amber-800 bg-amber-700"
                            : "border-stone-300 bg-stone-100 dark:border-zinc-500")
                        }
                        aria-hidden
                      />
                      <span className="font-semibold">{opt.label}</span>
                    </span>
                  )}
                />
              </Field>
              <div className="mt-4">
                <Field
                  label={`Paper cost · ${paperGrade.label}`}
                  hint={`₹${form.paperCostPerKg || 0} / kg`}
                >
                  <Slider
                    value={toNum(form.paperCostPerKg)}
                    min={paperGrade.min}
                    max={paperGrade.max}
                    onChange={(v) => setField("paperCostPerKg", String(v))}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-stone-400 dark:text-zinc-500">
                    <span>₹{paperGrade.min}</span>
                    <span>₹{paperGrade.max}</span>
                  </div>
                </Field>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Coating"
                value={form.coating}
                onChange={(v) => setField("coating", v)}
                options={COATINGS.map((c) => ({
                  id: c.id,
                  label: c.ratePerSqm > 0 ? `${c.label} · ₹${c.ratePerSqm}/m²` : c.label,
                }))}
              />
              <SelectField
                label="Printing"
                value={form.printing}
                onChange={(v) => setField("printing", v)}
                options={PRINTING_OPTIONS.map((p) => ({
                  id: p.id,
                  label: p.ratePerBox > 0 ? `${p.label} · ₹${p.ratePerBox}/box` : p.label,
                }))}
              />
            </div>
          </Section>

          {/* Quantity */}
          <Section
            title="Order quantity"
            subtitle={`Markup ×${activeTier.markup.toFixed(2)} applies at ${activeTier.label} units.`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {QUANTITY_PRESETS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setField("quantity", String(q))}
                  className={
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all " +
                    (Number(form.quantity) === q
                      ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                      : "border-stone-200 bg-white text-stone-600 hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-amber-500 dark:hover:text-amber-400")
                  }
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="mt-3 max-w-[180px]">
              <NumberInput
                value={form.quantity}
                onChange={(v) => setField("quantity", v)}
                min={1}
                suffix="boxes"
                placeholder="Custom"
              />
            </div>
          </Section>

          {/* One-time costs */}
          <Section
            title="One-time set-up costs"
            subtitle="Charged once per order, not per box."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {ONE_TIME_COST_FIELDS.map((field) => (
                <Field key={field.id} label={field.label} hint={field.hint}>
                  <NumberInput
                    value={form.oneTimeCosts[field.id]}
                    onChange={(v) => setOneTime(field.id, v)}
                    prefix="₹"
                    placeholder="0"
                  />
                </Field>
              ))}
            </div>
          </Section>
        </div>

        {/* ------------------------------ results ------------------------------ */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-stone-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 dark:border-zinc-800 dark:from-amber-500/10 dark:to-transparent">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-400">
                  Cost estimate
                </h2>
                <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold text-stone-500 shadow-sm dark:bg-zinc-800 dark:text-zinc-400">
                  {boxType.shortLabel}
                </span>
              </div>

              {quote ? (
                <div className="mt-4">
                  <p className="text-xs font-medium text-stone-500 dark:text-zinc-400">
                    Total for {quote.quantity} boxes
                  </p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-stone-900 dark:text-zinc-50">
                    {formatINR(quote.total)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500 dark:text-zinc-400">
                    {formatINR(quote.unitPrice)} / box
                    <span className="mx-1.5 text-stone-300 dark:text-zinc-600">•</span>
                    {formatINR(quote.allInPerBox)} all-in / box
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-stone-500 dark:text-zinc-400">
                  Enter valid dimensions to see the estimate.
                </p>
              )}
            </div>

            {quote && (
              <div className="p-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-zinc-500">
                  Calculation breakdown
                </h3>
                <ol className="space-y-3 text-sm">
                  <BreakdownRow
                    step={1}
                    label="Sheet size"
                    value={`${formatNumber(quote.sheet.sheetLength, 0)} × ${formatNumber(quote.sheet.sheetWidth, 0)} mm`}
                    note="2L + 2W + joint, H + W + trim"
                  />
                  <BreakdownRow
                    step={2}
                    label="Sheet area"
                    value={`${formatNumber(quote.areaM2, 3)} m²`}
                    note={`${formatNumber(quote.sheet.sheetLength, 0)} × ${formatNumber(quote.sheet.sheetWidth, 0)} mm ÷ 10⁶`}
                  />
                  <BreakdownRow
                    step={3}
                    label="Material weight"
                    value={`${formatNumber(quote.weightKg, 3)} kg`}
                    note={`${formatNumber(quote.gsm, 0)} GSM × ${formatNumber(quote.areaM2, 3)} m² ÷ 1000`}
                  />
                  <BreakdownRow
                    step={4}
                    label="Material cost"
                    value={formatINR(quote.material)}
                    note={`${formatNumber(quote.weightKg, 3)} kg × ₹${quote.paperCostPerKg} × ${quote.markup.toFixed(2)}`}
                  />
                  <BreakdownRow
                    step={5}
                    label="Unit price"
                    value={formatINR(quote.unitPrice)}
                    note={`Material + coating ${formatINR(quote.coatingCost)} + printing ${formatINR(quote.printingCost)}`}
                  />
                  <BreakdownRow
                    step={6}
                    label="Total boxes"
                    value={formatINR(quote.quantityCost)}
                    note={`${formatINR(quote.unitPrice)} × ${quote.quantity}`}
                  />
                  <BreakdownRow
                    step={7}
                    label="One-time set-up"
                    value={formatINR(quote.oneTime)}
                    note="Stamps, die, labour, machine set-up"
                  />
                </ol>

                <div className="mt-5 rounded-xl bg-stone-50 p-4 dark:bg-zinc-800/60">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-stone-700 dark:text-zinc-200">
                      Grand total
                    </span>
                    <span className="text-xl font-bold text-stone-900 dark:text-zinc-50">
                      {formatINR(quote.total)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs text-stone-500 dark:text-zinc-400">
                    <span>All-in per box</span>
                    <span>{formatINR(quote.allInPerBox)}</span>
                  </div>
                </div>

                <p className="mt-4 text-center text-[11px] leading-4 text-stone-400 dark:text-zinc-500">
                  Estimates are indicative. Final pricing depends on your
                  supplier&apos;s rates.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function BreakdownRow({ step, label, value, note }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500 dark:bg-zinc-800 dark:text-zinc-400">
        {step}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-stone-600 dark:text-zinc-300">{label}</span>
          <span className="shrink-0 font-semibold tabular-nums text-stone-900 dark:text-zinc-100">
            {value}
          </span>
        </div>
        {note && (
          <p className="mt-0.5 break-words text-[11px] leading-4 text-stone-400 dark:text-zinc-500">
            {note}
          </p>
        )}
      </div>
    </li>
  );
}
