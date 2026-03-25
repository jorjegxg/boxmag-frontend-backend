"use client";

import { PrductCard } from "./ProductCard";
import useBusinessStore from "../store/business_store";
import MyGrid from "./MyGrid";

export default function GridOfBoxes() {
  const boxes = useBusinessStore().boxes;
  const confirmBox = useBusinessStore().confirmBox;

  return (
    <MyGrid>
      {boxes.map((box) => (
            <PrductCard
              key={box.id}
              title={box.name}
              id={box.id}
              imagePath={box.imagePath}
              isSelected={box.isSelected}
              confirmItem={confirmBox}
            />
      ))}
    </MyGrid>
  );
}
