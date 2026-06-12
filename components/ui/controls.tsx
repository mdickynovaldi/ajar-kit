"use client";

/* AjarKit — primitif kontrol tipis di atas kelas design system (globals.css).
   Setiap komponen punya state default/hover/focus/disabled/loading via CSS. */

import { Icon, type IconName } from "./icon";

/* ---------- Button ---------- */
type BtnVariant = "primary" | "secondary" | "ghost" | "destructive" | "ai";
type BtnSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  iconLeft,
  iconRight,
  className = "",
  children,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: BtnSize;
  block?: boolean;
  loading?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
}) {
  return (
    <button
      className={[
        "btn",
        `btn-${variant}`,
        size !== "md" ? size : "",
        block ? "block" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <span
          className="spinner"
          style={{ borderColor: "rgba(255,255,255,.35)", borderTopColor: "#fff" }}
        />
      ) : (
        iconLeft && <Icon name={iconLeft} />
      )}
      {children}
      {iconRight && !loading && <Icon name={iconRight} />}
    </button>
  );
}

/* ---------- Field ---------- */
export function Field({
  label,
  help,
  error,
  children,
  className = "",
}: {
  label?: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`field${error ? " error" : ""} ${className}`.trim()}>
      {label && <label>{label}</label>}
      {children}
      {(error || help) && <p className="help">{error || help}</p>}
    </div>
  );
}

/* ---------- Switch ---------- */
export function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`switch${on ? " on" : ""}`}
      onClick={() => onChange(!on)}
    />
  );
}

/* ---------- Segmented ---------- */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full,
}: {
  options: {
    value: T;
    label: string;
    /** opsi terkunci (mis. fitur Pro) — tidak bisa dipilih */
    disabled?: boolean;
    /** label kecil di samping opsi, mis. "Pro" */
    hint?: string;
  }[];
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div
      className="segmented"
      style={full ? { display: "flex", width: "100%" } : undefined}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? "on" : ""}
          style={{
            ...(full ? { flex: 1 } : undefined),
            ...(o.disabled
              ? { opacity: 0.55, cursor: "not-allowed" }
              : undefined),
          }}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.hint && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                marginLeft: 5,
                opacity: 0.75,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {o.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Chip ---------- */
export function Chip({
  on,
  onToggle,
  children,
}: {
  on?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`chip${on ? " on" : ""}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      {children}
    </button>
  );
}

/* ---------- Badge status dokumen ---------- */
export function StatusBadge({
  badge,
  children,
}: {
  badge: string;
  children: React.ReactNode;
}) {
  return <span className={`badge ${badge}`}>{children}</span>;
}

/* ---------- Avatar ---------- */
export function Avatar({
  initials,
  size,
}: {
  initials: string;
  size?: "sm" | "lg";
}) {
  return <span className={`avatar${size ? ` ${size}` : ""}`}>{initials}</span>;
}

/* ---------- Empty state ---------- */
export function EmptyState({
  icon = "files",
  title,
  desc,
  children,
}: {
  icon?: IconName;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="ill">
        <Icon name={icon} />
      </span>
      <h3 className="t-h3">{title}</h3>
      {desc && (
        <p className="muted t-body" style={{ marginTop: 6, maxWidth: 380, marginInline: "auto" }}>
          {desc}
        </p>
      )}
      {children && (
        <div className="row center wrap" style={{ marginTop: 18 }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- Skeleton ---------- */
export function Skeleton({
  height = 14,
  width = "100%",
  style,
}: {
  height?: number | string;
  width?: number | string;
  style?: React.CSSProperties;
}) {
  return <div className="skel" style={{ height, width, ...style }} />;
}

/* ---------- Step indicator wizard ---------- */
export function Steps({ total, current }: { total: number; current: number }) {
  return (
    <div className="steps">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const cls = n === current ? "s on" : n < current ? "s done" : "s";
        return (
          <span key={n} style={{ display: "contents" }}>
            <div className={cls}>
              <span className="dot-s">
                {n < current ? <Icon name="check" style={{ width: 13, height: 13 }} /> : n}
              </span>
            </div>
            {n < total && <div className="line" />}
          </span>
        );
      })}
    </div>
  );
}

/* ---------- Progress bar ---------- */
export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ---------- Banner ---------- */
export function Banner({
  variant,
  icon = "alert",
  children,
  style,
}: {
  variant?: "warn" | "info";
  icon?: IconName;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`banner${variant ? ` ${variant}` : ""}`} style={style}>
      <Icon name={icon} />
      {children}
    </div>
  );
}
