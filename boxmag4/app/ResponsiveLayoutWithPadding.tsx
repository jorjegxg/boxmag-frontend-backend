import React from "react";

export default function ResponsiveLayoutWithPadding({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-20 flex flex-col items-center">
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}
