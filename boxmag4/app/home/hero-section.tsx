import Image from "next/image";
import type { Language } from "../i18n/translations";
import { tServer } from "@/lib/i18n-server";
import { B2b } from "../global/components/b2b";
import { HeroConfigurator } from "./hero-configurator";

export function HomeHeroSection({ language }: { language: Language }) {
  return (
    <>
      <B2b />
      <section className="w-full bg-white py-10 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="bg-my-yellow rounded-3xl px-8 py-10 lg:px-12 lg:py-12 flex flex-col lg:flex-row items-stretch gap-10">
            <div className="flex-1 flex flex-col justify-between gap-8">
              <h1 className="text-3xl lg:text-5xl font-extrabold text-black leading-tight uppercase">
                {tServer(language, "home.hero.title1")}
                <br />
                {tServer(language, "home.hero.title2")}
                <br />
                {tServer(language, "home.hero.title3")}
              </h1>

              <HeroConfigurator />
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-md">
                <Image
                  src="/b2b/boxes/ecommerce.png"
                  alt="Open e-commerce shipping box"
                  width={600}
                  height={400}
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 1024px) 100vw, 480px"
                  className="w-full h-auto object-contain rounded-3xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
