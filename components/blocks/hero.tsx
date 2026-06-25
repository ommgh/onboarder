import Image from "next/image";
import {
  ArrowRight,
  Barcode,
  ChartNoAxesColumn,
  PersonStanding,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashedLine } from "../dashed-line";

const features = [
  {
    title: "AI Image Enhancement",
    description: "Enhance product images with AI for better quality",
    icon: Sparkles,
  },
  {
    title: "Barcode Scanning",
    description: "Quickly add products using barcode scanning",
    icon: Barcode,
  },
  {
    title: "Models Library",
    description: "Utilize various AI models for different product types",
    icon: PersonStanding,
  },
  {
    title: "Analytics Dashboard",
    description: "Track product performance with detailed analytics",
    icon: ChartNoAxesColumn,
  },
];

export const Hero = () => {
  return (
    <section className="py-28 lg:py-32 lg:pt-44 overflow-hidden">
      <div className="container flex flex-col justify-between gap-8 md:gap-14 lg:flex-row lg:gap-20">
        <div className="flex-1">
          <h1 className="text-foreground max-w-160 text-3xl tracking-tight md:text-4xl lg:text-5xl xl:whitespace-nowrap">
            Onboarder
          </h1>
          <p className="text-muted-foreground text-1xl mt-5 md:text-3xl">
            Get your products e-commerce ready in minutes with AI-powered
            descriptions, titles, and more.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 lg:flex-nowrap">
            <Button asChild>
              <a href="https://O
onboarder.store/dashboard">Get Started</a>
            </Button>
            <Button
              variant="outline"
              className="h-auto gap-2 shadow-md"
              asChild
            >
              <a
                href="https://youtube.com"
                className="max-w-56 truncate text-start md:max-w-none"
              >
                Watch Demo
                <ArrowRight className="stroke-3" />
              </a>
            </Button>
          </div>
        </div>

        <div className="relative flex flex-1 flex-col justify-center space-y-5 max-lg:pt-10 lg:pl-10">
          <DashedLine
            orientation="vertical"
            className="absolute top-0 left-0 max-lg:hidden dark:invert"
          />
          <DashedLine
            orientation="horizontal"
            className="absolute top-0 lg:hidden h-64 dark:invert"
          />
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex gap-2.5 lg:gap-5">
                <Icon className="text-foreground mt-1 size-4 shrink-0 lg:size-5" />
                <div>
                  <h2 className="font-text text-foreground font-semibold">
                    {feature.title}
                  </h2>
                  <p className="text-muted-foreground max-w-76 text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-12 md:mt-20 lg:container lg:mt-24 px-6 max-lg:px-6">
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden shadow-lg">
          <Image
            src="/hero-dark.png"
            alt="hero"
            fill
            className="object-cover object-center rounded-2xl dark:block hidden"
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
          />
          <Image
            src="/hero.png"
            alt="hero"
            fill
            className="object-cover object-center rounded-2xl dark:hidden"
            sizes="(max-width: 768px) 100vw, 80vw"
            priority
          />
        </div>
      </div>
    </section>
  );
};
