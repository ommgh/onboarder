import { Footer } from "@/components/blocks/footer";
import { Navbar } from "@/components/blocks/navbar";

import "@/styles/globals.css";
export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      
      <Navbar />
      <main className="">{children}</main>
      <Footer />
    </>
  );
}
