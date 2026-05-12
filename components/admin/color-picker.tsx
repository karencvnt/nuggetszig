"use client";

const PRESETS = [
  "#6172f3", "#444ce7", "#3538cd",
  "#f04438", "#d92d20", "#b42318",
  "#12b76a", "#039855", "#027a48",
  "#f79009", "#dc6803", "#b54708",
  "#9e77ed", "#7f56d9", "#6941c6",
  "#ee46bc", "#dd2590", "#c11574",
  "#0086c9", "#0069a6", "#065986",
  "#667085", "#344054", "#101828",
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  error?: string;
}

export function ColorPicker({ value, onChange, error }: ColorPickerProps) {
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(value);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
              value === color ? "border-neutral-900 scale-110" : "border-transparent"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg border border-neutral-200 flex-shrink-0"
          style={{ backgroundColor: isValid ? value : "#e5e7eb" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          maxLength={7}
          className={`flex-1 px-3 py-2 rounded-lg border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            error ? "border-error-500" : "border-neutral-300"
          }`}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-error-600">{error}</p>}
    </div>
  );
}
