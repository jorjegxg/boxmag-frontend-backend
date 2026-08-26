import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { blockNegativeInput, sanitizeNumericString } from "../../utils/number-input";

export function MyInputField({
  text,
  id,
  type,
  placeholder,
  disabled,
  value,
  onChange,
  error,
  min,
  step,
  allowDecimal = false,
}: {
  text: string;
  id: string;
  type?: "text" | "number" | "email" | "password" | null;
  placeholder: string;
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  min?: number;
  step?: number | string;
  allowDecimal?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === "password";
  const isNumberField = type === "number";
  const resolvedType = isPasswordField ? (showPassword ? "text" : "password") : (type ?? "text");

  return (
    <Field>
      <FieldLabel htmlFor={id} className="font-bold text-lg">
        {text}
      </FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={resolvedType}
          placeholder={placeholder}
          className={`rounded-lg py-6 px-4 text-lg ${isPasswordField ? "pr-12" : ""} ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
          disabled={disabled}
          value={value}
          min={isNumberField ? (min ?? 0) : undefined}
          step={isNumberField ? step : undefined}
          onBeforeInput={
            isNumberField ? (event) => blockNegativeInput(event, { allowDecimal }) : undefined
          }
          onChange={(e) =>
            onChange?.(
              isNumberField ? sanitizeNumericString(e.target.value, { allowDecimal }) : e.target.value
            )
          }
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </Field>
  );
}
