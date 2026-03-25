"use client";

import useBusinessStore from "../store/business_store";
import MyGrid from "./MyGrid";
import { PrductCard } from "./ProductCard";

export function CarboardType() {
  const carboarsTypes = useBusinessStore(
    (state) => state.carboarbonTypeOptions,
  );

  const confirmCarboardTypeOption = useBusinessStore(
    (state) => state.confirmCarboardTypeOption,
  );

  return (
    <MyGrid>
      {carboarsTypes.map((carboarsType) => {
        return (
          <PrductCard
            title={carboarsType.name}
            id={carboarsType.id}
            key={carboarsType.id}
            imagePath={carboarsType.imagePath}
            centerItems={false}
            isSelected={carboarsType.isSelected}
            confirmItem={confirmCarboardTypeOption}
          />
        );
      })}
    </MyGrid>
  );
}
