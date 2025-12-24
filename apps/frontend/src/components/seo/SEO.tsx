import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  name?: string;
  type?: string;
  image?: string;
  url?: string;
  noindex?: boolean;
}

export default function SEO({
  title,
  description,
  keywords,
  name = 'AI Job Suite',
  type = 'website',
  image = 'https://aijobsuite.bankhosa.com/og-image.jpg', // Placeholder, needs actual image
  url,
  noindex = false,
}: SEOProps) {
  const siteTitle = 'AI Job Suite | Intelligent Career Engineering';
  const metaTitle = title ? `${title} | ${name}` : siteTitle;
  const metaDescription = description || 'AI-powered job search automation, resume optimization, and career intelligence platform. Build your professional future with Bankhosa.';
  const metaKeywords = keywords ? keywords.join(', ') : 'job board, resume builder, ai career coach, job scraper, career automation, bankhosa';
  const siteUrl = url || window.location.href;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />
      <meta name="author" content="Bankhosa" />
      <link rel="canonical" href={siteUrl} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {!noindex && <meta name="robots" content="index, follow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:site_name" content={name} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:creator" content="@bankhosa" />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data (JSON-LD) */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "AI Job Suite",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "description": "AI-powered platform for job search automation and resume optimization.",
          "author": {
            "@type": "Organization",
            "name": "Bankhosa",
            "url": "https://bankhosa.com"
          }
        })}
      </script>
    </Helmet>
  );
}
