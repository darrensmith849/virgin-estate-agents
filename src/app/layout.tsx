import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SITE } from "@/lib/constants";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Property in Harare, Zimbabwe`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: SITE.name,
    description: SITE.description,
    type: "website",
    locale: "en_ZW",
    siteName: SITE.name,
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 675,
        alt: `${SITE.name} — premium property in Harare`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
    images: ["/og-image.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#101815",
  colorScheme: "light",
};

// LocalBusiness / RealEstateAgent structured data (site-wide).
const orgSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: SITE.name,
  description: SITE.description,
  url: SITE.url,
  image: `${SITE.url}/og-image.jpg`,
  logo: `${SITE.url}/og-image.jpg`,
  telephone: SITE.whatsapp,
  email: SITE.email,
  priceRange: "$$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "7 Normandy Road",
    addressLocality: SITE.city,
    addressCountry: "ZW",
  },
  areaServed: { "@type": "City", name: `${SITE.city}, ${SITE.country}` },
  knowsAbout: [
    "Borrowdale",
    "Highlands",
    "Mount Pleasant",
    "Avondale",
    "Chisipite",
    "Glen Lorne",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        {children}
        {process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
          />
        )}
      </body>
    </html>
  );
}
