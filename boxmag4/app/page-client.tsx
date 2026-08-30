"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import ProducersBanner from "./home/producers-banner";

const BoxfixSection = dynamic(() => import("./home/boxfix-section"), {
  ssr: true,
});
const CorrugatedEnvelopesSection = dynamic(
  () => import("./home/corrugated-envelopes-section"),
  { ssr: true },
);
const WhyChooseBoxfixSection = dynamic(
  () =>
    import("./global/components/why-choose-boxfix-section").then((m) => ({
      default: m.WhyChooseBoxfixSection,
    })),
  { ssr: true },
);
const TestimonialSection = dynamic(() => import("./home/testimonial-section"), {
  ssr: true,
});
const FeaturesSection = dynamic(
  () =>
    import("./global/components/features-section").then((m) => ({
      default: m.FeaturesSection,
    })),
  { ssr: true },
);
const ServicesSection = dynamic(
  () =>
    import("./global/components/services-section").then((m) => ({
      default: m.ServicesSection,
    })),
  { ssr: true },
);
const HaveAQuestion = dynamic(
  () =>
    import("./global/components/have-a-question").then((m) => ({
      default: m.HaveAQuestion,
    })),
  { ssr: true },
);
const NewsletterSubscribe = dynamic(
  () =>
    import("./global/components/newsletter-subscribe").then((m) => ({
      default: m.NewsletterSubscribe,
    })),
  { ssr: true },
);
const PartnerLogosStrip = dynamic(
  () =>
    import("./global/components/partner-logos-strip").then((m) => ({
      default: m.PartnerLogosStrip,
    })),
  { ssr: true },
);

export default function HomeBelowFold() {
  const router = useRouter();
  return (
    <div>
      <ProducersBanner />
      <BoxfixSection onSeeNow={() => router.push("/boxesfetco")} />
      <CorrugatedEnvelopesSection
        onSeeNow={() => router.push("/corrugated-envelopes")}
      />
      <WhyChooseBoxfixSection />
      <TestimonialSection />
      <FeaturesSection />
      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
      <PartnerLogosStrip />
    </div>
  );
}
