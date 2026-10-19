import Head from "next/head";
import useConfig from "../hooks/config.hook";

const Meta = ({
  title,
  description,
  noIndex = true,
}: {
  title: string;
  description?: string;
  /**
   * Defaults to true so every page (account, admin, share links, auth
   * tokens, etc.) stays out of search results unless a page explicitly
   * opts in. Only public marketing pages (e.g. the homepage) should pass
   * `noIndex={false}`.
   */
  noIndex?: boolean;
}) => {
  const config = useConfig();

  const metaTitle = `${title} - ${config.get("general.appName")}`;
  const metaDescription =
    description ?? "An open-source and self-hosted sharing platform.";

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="og:title" content={metaTitle} />
      <meta name="og:description" content={metaDescription} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta
        name="robots"
        content={noIndex ? "noindex, nofollow" : "index, follow"}
      />
    </Head>
  );
};

export default Meta;
