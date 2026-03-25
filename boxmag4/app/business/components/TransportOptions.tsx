"use client";

import useBusinessStore from "../store/business_store";
import MyOutlinedButton from "./MyOutlinedButton";

const TransportOptions = () => {
  const transportOptions = useBusinessStore().transportOptions;
  const confirmTransportOption = useBusinessStore().confirmTransportOption;

  return (
    <span className="grid grid-cols-3 gap-x-8 gap-y-4 ">
      {transportOptions.map((option) => (
        <MyOutlinedButton
          key={option.id}
          isSelected={option.isSelected || false}
          onClick={() => confirmTransportOption(option.id)}
          textOnTheButton={option.name}
          showArrow={false}
        />
      ))}
    </span>
  );
};

export default TransportOptions;
