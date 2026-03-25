"use client";
import { FaArrowRight } from "react-icons/fa";
import { LiaCheckDoubleSolid } from "react-icons/lia";
import MyOutlinedButton from "./MyOutlinedButton";
import { MouseEvent } from "react";
import useBusinessStore from "../store/business_store";

export function TypeOfSizes() {
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
          textOnTheButton={option.name}
          showArrow={false}
        />
      ))}
    </span>
  );
}
