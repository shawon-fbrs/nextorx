import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Nextorx - Web Trading Platform",
  description: "Binary options trading platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${roboto.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}


{/* 
  
  ---------------------------------
  |             |___top nav________|
  |left sidebar |             |    |
  |             |             |    |
  |             |             |    |
  ---------------------------------


*/}