import React from "react";
import { FaArrowRight } from "react-icons/fa";
import { LiaCheckDoubleSolid } from "react-icons/lia";

const MyOutlinedButton = ({
  isSelected,
  onClick,
  textOnTheButton,
  confirmedText,
  showArrow = true,
  reverseColors = false,
  className = "",
}: {
  isSelected: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  textOnTheButton: string;
  confirmedText?: string;
  showArrow?: boolean;
  reverseColors?: boolean;
  className?: string;
}) => {
  return (
    <button
      className={`text-lg rounded-lg font-semibold border border-my-yellow max-sm:px-4 sm:px-12 py-2 gap-2 flex items-center justify-center text-center
      ${className}
      ${
        reverseColors
          ? isSelected
            ? "bg-white hover:bg-my-yellow"
            : "bg-my-yellow hover:bg-white"
          : isSelected
            ? "bg-my-yellow"
            : "hover:bg-my-yellow"
      } 
      `}
      onClick={onClick}
    >
      <LiaCheckDoubleSolid className={`${!isSelected ? "hidden" : ""}`} />

      {isSelected ? (confirmedText ?? textOnTheButton) : textOnTheButton}

      {showArrow && <div>{!isSelected && <FaArrowRight />}</div>}
    </button>
  );
};

export default MyOutlinedButton;
