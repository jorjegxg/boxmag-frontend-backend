"use client";
import { MyInputField } from "./MyInputField";
import { useLanguage } from "../../i18n/language-context";

type QuantityProps = {
  quantity: string;
  onQuantityChange: (value: string) => void;
  quantityError?: string;
};

const Quantity = ({ quantity, onQuantityChange, quantityError }: QuantityProps) => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="grid grid-cols-3 gap-x-8">
        <div className="col-span-1">
          <MyInputField
            text={t("business.quantity")}
            id="boxes-quantity"
            type={"number"}
            min={1}
            placeholder={t("business.quantity")}
            value={quantity}
            onChange={onQuantityChange}
            error={quantityError}
          />
        </div>
      </div>
    </div>
  );
};

export default Quantity;
