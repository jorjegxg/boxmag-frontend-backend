"use client";

import ContentLoader from "react-content-loader";
import { PrductCard } from "./ProductCard";
import useBusinessStore from "../store/business_store";
import MyGrid from "./MyGrid";

export default function GridOfBoxes() {
  const boxes = useBusinessStore((state) => state.boxes);
  const confirmBox = useBusinessStore((state) => state.confirmBox);
  const isLoadingBoxes = useBusinessStore((state) => state.isLoadingBoxes);

  if (isLoadingBoxes) {
    return (
      <MyGrid>
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`box-skeleton-${index}`}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <ContentLoader
              speed={1.4}
              width="100%"
              height={440}
              viewBox="0 0 260 240"
              backgroundColor="#f1f5f9"
              foregroundColor="#e2e8f0"
              style={{ width: "100%", height: "440px" }}
            >
              <rect x="0" y="0" rx="12" ry="12" width="260" height="168" />
              <rect x="16" y="184" rx="6" ry="6" width="176" height="14" />
              <rect x="16" y="206" rx="6" ry="6" width="132" height="12" />
            </ContentLoader>
          </div>
        ))}
      </MyGrid>
    );
  }

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
