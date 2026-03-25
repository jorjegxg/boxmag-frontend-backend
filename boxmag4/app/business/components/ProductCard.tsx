"use client";
import Image from "next/image";
import React from "react";
import { LiaCheckDoubleSolid } from "react-icons/lia";
import useBusinessStore from "../store/business_store";
import MyOutlinedButton from "./MyOutlinedButton";

export function PrductCard({
  title,
  id,
  imagePath,
  centerItems = true,
  isSelected = false,
  confirmItem,
}: {
  title: string;
  id: number;
  imagePath?: string;
  centerItems?: boolean;
  isSelected?: boolean;
  confirmItem: (id: number) => void;
}) {
  const handleClick = () => confirmItem(id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`w-full rounded-2xl flex flex-col items-center h-full min-w-0 cursor-pointer transition-all duration-200 overflow-hidden border-2 focus:outline-none focus:ring-2 focus:ring-my-red focus:ring-offset-2 ${
        isSelected
          ? "border-my-yellow bg-my-yellow/5 shadow-md"
          : "border-my-light-gray hover:border-my-yellow hover:bg-gray-50/50"
      }`}
    >
      <div
        className={`bg-my-light-gray2 w-full flex rounded-t-2xl min-h-[200px] sm:min-h-[260px] ${
          centerItems ? "justify-center" : "justify-end"
        }`}
      >
        <Image
          src={imagePath ?? "/placeholders/box2.png"}
          alt={title}
          width={centerItems ? 200 : 300}
          height={centerItems ? 200 : 300}
          className="object-contain"
        />
      </div>
      <div className="font-semibold text-center text-sm sm:text-lg px-4 sm:px-6 sm:py-6 w-full">
        {title}
      </div>

      <div className="w-full px-3 sm:px-4 pb-6 pt-2 mt-auto">
        <MyOutlinedButton
          isSelected={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          textOnTheButton="CONFIRM"
          confirmedText="CONFIRMED"
          className="w-full"
        />
      </div>
    </div>
  );
}
