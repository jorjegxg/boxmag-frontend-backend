"use client";

import useBusinessStore from "../store/business_store";
import MyOutlinedButton from "./MyOutlinedButton";

export const BoxPrintButtons = () => {
  const boxPrintOptions = useBusinessStore((state) => state.boxPrintOptions);
  const confirmBoxPrintOption = useBusinessStore(
    (state) => state.confirmBoxPrintOption,
  );

  return (
    <span className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
      {boxPrintOptions.map((option) => (
        <MyOutlinedButton
          key={option.id}
          isSelected={option.isSelected ?? false}
          onClick={() => confirmBoxPrintOption(option.id)}
          textOnTheButton={option.name}
          showArrow={false}
        />
      ))}
    </span>
  );
};

export default BoxPrintButtons;
