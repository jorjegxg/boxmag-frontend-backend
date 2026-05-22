export default function MobileAppSvgPage() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide text-gray-800">
          BOXMAG mobile UI (SVG)
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Static vector mockup — export or embed anywhere.
        </p>
        <div className="mt-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mobile-app-page.svg"
            alt="BOXMAG mobile application mockup"
            width={440}
            height={880}
            className="h-auto max-w-full drop-shadow-lg"
          />
        </div>
        <p className="mt-6 text-xs text-gray-500">
          File: <code className="rounded bg-gray-200 px-1 py-0.5">public/mobile-app-page.svg</code>
        </p>
      </div>
    </div>
  );
}
