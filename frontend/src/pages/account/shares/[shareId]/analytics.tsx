import {
  Alert,
  Box,
  Breadcrumbs,
  Grid,
  Group,
  Paper,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { GetServerSidePropsContext } from "next";
import moment from "moment";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TbAlertCircle } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import ShareAnalyticsChart from "../../../../components/account/ShareAnalyticsChart";
import CenterLoader from "../../../../components/core/CenterLoader";
import Meta from "../../../../components/Meta";
import useTranslate from "../../../../hooks/useTranslate.hook";
import shareService from "../../../../services/share.service";
import { ShareAnalytics } from "../../../../types/share.type";

export function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: { shareId: context.params!.shareId },
  };
}

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <Paper withBorder p="md" radius="md">
    <Text size="xs" color="dimmed" weight={700} transform="uppercase">
      {label}
    </Text>
    <Text size={28} weight={700}>
      {value}
    </Text>
  </Paper>
);

const ShareAnalyticsPage = ({ shareId }: { shareId: string }) => {
  const t = useTranslate();

  const [analytics, setAnalytics] = useState<ShareAnalytics>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    shareService
      .getAnalytics(shareId)
      .then(setAnalytics)
      .catch((e) => {
        setError(
          e?.response?.status === 403 || e?.response?.status === 404
            ? t("account.shares.analytics.error.denied")
            : t("common.error.unknown"),
        );
      });
  }, [shareId, t]);

  if (error) {
    return (
      <Alert icon={<TbAlertCircle size={18} />} color="red" title={t("common.error")}>
        {error}
      </Alert>
    );
  }

  if (!analytics) return <CenterLoader />;

  const expiryLabel = analytics.expiresAt
    ? analytics.expiresInMs && analytics.expiresInMs > 0
      ? moment.duration(analytics.expiresInMs, "milliseconds").humanize()
      : t("account.shares.analytics.expiry.expired")
    : t("account.shares.table.expiry-never");

  return (
    <>
      <Meta title={t("account.shares.analytics.title")} />
      <Breadcrumbs mb="md">
        <Link href="/account/shares">
          <FormattedMessage id="account.shares.title" />
        </Link>
        <Text>{shareId}</Text>
      </Breadcrumbs>
      <Title mb={30} order={3}>
        <FormattedMessage
          id="account.shares.analytics.title.withId"
          values={{ id: shareId }}
        />
      </Title>

      <Grid mb="xl">
        <Grid.Col span={6} sm={3}>
          <StatCard
            label={t("account.shares.analytics.stat.views")}
            value={String(analytics.totalViews)}
          />
        </Grid.Col>
        <Grid.Col span={6} sm={3}>
          <StatCard
            label={t("account.shares.analytics.stat.downloads")}
            value={String(analytics.totalDownloads)}
          />
        </Grid.Col>
        <Grid.Col span={6} sm={3}>
          <StatCard
            label={t("account.shares.analytics.stat.uniqueVisitors")}
            value={String(analytics.uniqueVisitors)}
          />
        </Grid.Col>
        <Grid.Col span={6} sm={3}>
          <StatCard
            label={t("account.shares.analytics.stat.expiresIn")}
            value={expiryLabel}
          />
        </Grid.Col>
      </Grid>

      <Paper withBorder p="md" radius="md" mb="xl">
        <Title order={5} mb="md">
          <FormattedMessage id="account.shares.analytics.chart.title" />
        </Title>
        <ShareAnalyticsChart
          timeline={analytics.timeline}
          viewsLabel={t("account.shares.analytics.stat.views")}
          downloadsLabel={t("account.shares.analytics.stat.downloads")}
          emptyLabel={t("account.shares.analytics.chart.empty")}
        />
      </Paper>

      <Grid>
        <Grid.Col span={12} sm={6}>
          <Paper withBorder p="md" radius="md">
            <Title order={5} mb="md">
              <FormattedMessage id="account.shares.analytics.countries.title" />
            </Title>
            {analytics.topCountries.length === 0 ? (
              <Text size="sm" color="dimmed">
                <FormattedMessage id="account.shares.analytics.chart.empty" />
              </Text>
            ) : (
              <Table>
                <tbody>
                  {analytics.topCountries.map((row) => (
                    <tr key={row.country}>
                      <td>{row.country}</td>
                      <td>
                        <Group position="right">
                          <Text size="sm">{row.count}</Text>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Paper>
        </Grid.Col>
        <Grid.Col span={12} sm={6}>
          <Paper withBorder p="md" radius="md">
            <Title order={5} mb="md">
              <FormattedMessage id="account.shares.analytics.referrers.title" />
            </Title>
            {analytics.topReferrers.length === 0 ? (
              <Text size="sm" color="dimmed">
                <FormattedMessage id="account.shares.analytics.chart.empty" />
              </Text>
            ) : (
              <Table>
                <tbody>
                  {analytics.topReferrers.map((row) => (
                    <tr key={row.referrer}>
                      <td>{row.referrer}</td>
                      <td>
                        <Group position="right">
                          <Text size="sm">{row.count}</Text>
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Paper>
        </Grid.Col>
      </Grid>
      <Box mt="xl" />
    </>
  );
};

export default ShareAnalyticsPage;
