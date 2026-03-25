import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function MyInputField({
  text,
  id,
  type,
  placeholder,
  disabled,
  value,
  onChange,
  error,
}: {
  text: string;
  id: string;
  type?: "text" | "number" | "email" | "password" | null;
  placeholder: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className="font-bold text-lg">
        {text}
      </FieldLabel>
      <Input
        id={id}
        type={type ?? "text"}
        placeholder={placeholder}
        className={`rounded-lg py-6 px-4 text-lg ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </Field>
  );
}
