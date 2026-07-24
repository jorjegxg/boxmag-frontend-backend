"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import MyOutlinedButton from "./MyOutlinedButton";
import { useLanguage } from "../../i18n/language-context";

function isRemoteImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function PrductCard({
  title,
  id,
  imageUrl,
  centerItems = true,
  isSelected = false,
  confirmItem,
}: {
  title: string;
  id: number;
  imageUrl?: string;
  centerItems?: boolean;
  isSelected?: boolean;
  confirmItem: (id: number) => void;
}) {
  const handleClick = () => confirmItem(id);
  const { t } = useLanguage();
  const fallbackImage = "/pictures/factory.jpg";
  const [resolvedImageUrl, setResolvedImageUrl] = useState(
    imageUrl?.trim() || fallbackImage,
  );

  useEffect(() => {
    const next = imageUrl?.trim();
    setResolvedImageUrl(next && next.length > 0 ? next : fallbackImage);
  }, [imageUrl]);

  const imageWidth = centerItems ? 200 : 300;
  const imageHeight = centerItems ? 200 : 300;
  const handleImageError = () => {
    if (resolvedImageUrl !== fallbackImage) {
      setResolvedImageUrl(fallbackImage);
    }
  };

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
        {/* Remote CDN URLs: skip next/image+sharp (native RSS spikes on small VPS). */}
        {isRemoteImageUrl(resolvedImageUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedImageUrl}
            alt={title}
            width={imageWidth}
            height={imageHeight}
            className="object-contain"
            onError={handleImageError}
          />
        ) : (
          <Image
            src={resolvedImageUrl}
            alt={title}
            width={imageWidth}
            height={imageHeight}
            className="object-contain"
            onError={handleImageError}
          />
        )}
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
          textOnTheButton={t("business.confirm")}
          confirmedText={t("business.confirmed")}
          className="w-full"
        />
      </div>
    </div>
  );
}
