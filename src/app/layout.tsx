import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const display = Bricolage_Grotesque({ variable: "--font-display-face", subsets: ["latin"] });

const THEME_SCRIPT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export const metadata: Metadata = {
  title: { default: "AllWork — Any Work. Any Skill. Any Person.", template: "%s · AllWork" },
  description:
    "Find work, hire talent, build projects and collaborate. One AI-powered platform for every kind of work — from fixing a fan to staffing a factory.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${display.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint so there's no flash. Dark is the default. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
