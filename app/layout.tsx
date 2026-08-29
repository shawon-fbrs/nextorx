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
    <html lang="en" className={`${roboto.variable}`}>
      <body className="antialiased">{children}</body>
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


  as like the assets section make another verticle section at chart left side and place drawing tools, candlestick, time, indicator and full screen. always appeared. for drawing tools show these main items: line, circle, fibonacchi, pattern. when click on any of these main items show sub items. for example if click on line show sub items: trend line, horizontal line, vertical line, ray line, extended line. i mean defulat klinechart items that comes in the box. and below these drawing tools section show candlesitck, time, indicator and full screen.make sure that these items are always visible on the left side of the chart.*/}