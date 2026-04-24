"use client";
import useBusinessStore from "../store/business_store";
import MyGrid from "./MyGrid";
import { PrductCard } from "./ProductCard";
import { useLanguage } from "../../i18n/language-context";

export function CarboardColors() {
  const { t } = useLanguage();
  const carboardColors = useBusinessStore((state) => state.boxColorOptions);
  const confirmBoxColorOption = useBusinessStore(
    (state) => state.confirmBoxColorOption,
  );

  return (
    // <span className="flex justify-between mt-16">
    <MyGrid>
      {carboardColors.map((carboardColor) => (
        <PrductCard
          key={carboardColor.id}
          title={t(`business.options.boxColor.${carboardColor.key}`)}
          id={carboardColor.id}
          imagePath={carboardColor.imagePath}
          isSelected={carboardColor.isSelected}
          confirmItem={confirmBoxColorOption}
        />
      ))}
    </MyGrid>
  );
}
