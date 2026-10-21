import { createGetInitialProps } from "@mantine/next";
import Document, { Head, Html, Main, NextScript } from "next/document";

const getInitialProps = createGetInitialProps();

export default class _Document extends Document {
  static getInitialProps = getInitialProps;

  render() {
    return (
      <Html>
        <Head>
          <link rel="manifest" href="/manifest.json" />
          <link rel="icon" type="image/x-icon" href="/img/favicon.ico" />
          <link rel="apple-touch-icon" href="/img/icons/icon-128x128.png" />

          <meta name="theme-color" content="#46509e" />
        </Head>
        <body>
          <Main />
          <NextScript />
          {/* Railyard Insights: cookieless page views (daily salted visitor
              hash, no IP or cookie stored). See
              railyard/apps/insights-edge/docs/FIRST-PARTY-SITES.md. */}
          <script
            defer
            src="https://insights.ereboslab.com/s.js"
            data-site="ry_site_vcpeer_send_80cdc14ff6bc"
          />
        </body>
      </Html>
    );
  }
}
