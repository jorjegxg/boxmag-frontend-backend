"use client";
import { MyInputField } from "./MyInputField";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

type QuantityProps = {
  quantity: string;
  onQuantityChange: (value: string) => void;
  acceptedTerms: boolean;
  onAcceptedTermsChange: (value: boolean) => void;
  quantityError?: string;
  termsError?: string;
};

const Quantity = ({
  quantity,
  onQuantityChange,
  acceptedTerms,
  onAcceptedTermsChange,
  quantityError,
  termsError,
}: QuantityProps) => {
  return (
    <div>
      <div className="grid grid-cols-3 gap-x-8">
        <div className="col-span-1">
          <MyInputField
            text={"Quantity"}
            id="boxes-quantity"
            type={"number"}
            placeholder={"Quantity"}
            value={quantity}
            onChange={onQuantityChange}
            error={quantityError}
          />
        </div>
      </div>

      <div className="pt-4 "></div>

      <FieldGroup className="mx-auto ">
        <Field orientation="horizontal">
          <Checkbox
            id="terms-checkbox-basic"
            name="terms-checkbox-basic"
            onCheckedChange={(checked) => {
              onAcceptedTermsChange(checked === "indeterminate" ? false : checked);
            }}
            checked={acceptedTerms}
          />
          <FieldLabel htmlFor="terms-checkbox-basic">
            Accept terms and conditions
          </FieldLabel>
        </Field>
      </FieldGroup>
      {termsError ? <p className="mt-2 text-sm text-red-600">{termsError}</p> : null}
    </div>
  );
};

export default Quantity;
