"use client";
import MyOutlinedButton from "./MyOutlinedButton";
import useBusinessStore from "../store/business_store";
import { useLanguage } from "../../i18n/language-context";

export function TypeOfSizes() {
  const { t } = useLanguage();
  const typeOfSizes = useBusinessStore((state) => state.typeOfSizes);
  const confirmTypeOfSize = useBusinessStore(
    (state) => state.confirmTypeOfSize,
  );

  return (
    <span className="grid grid-cols-3 gap-x-8 gap-y-4 ">
      {typeOfSizes.map((option) => (
        <MyOutlinedButton
          key={option.id}
          isSelected={option.isSelected || false}
          onClick={() => confirmTypeOfSize(option.id)}
          textOnTheButton={t(`business.options.sizeType.${option.key}`)}
          showArrow={false}
        />
      ))}
    </span>
  );
}
