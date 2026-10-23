import { Box, Group, Text, useMantineTheme } from "@mantine/core";
import { ShareAnalyticsTimelineEntry } from "../../types/share.type";

interface ShareAnalyticsChartProps {
  timeline: ShareAnalyticsTimelineEntry[];
  viewsLabel: string;
  downloadsLabel: string;
  emptyLabel: string;
}

// A small, dependency-free SVG bar chart. Added instead of pulling in a
// charting library (recharts/chart.js/etc) purely to keep this page's
// bundle impact to ~0kb for a feature that only needs grouped bars over a
// handful of days.
const CHART_HEIGHT = 160;
const BAR_GAP = 4;

const ShareAnalyticsChart = ({
  timeline,
  viewsLabel,
  downloadsLabel,
  emptyLabel,
}: ShareAnalyticsChartProps) => {
  const theme = useMantineTheme();

  if (timeline.length === 0) {
    return (
      <Box
        sx={{
          height: CHART_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text color="dimmed" size="sm">
          {emptyLabel}
        </Text>
      </Box>
    );
  }

  const maxValue = Math.max(
    1,
    ...timeline.map((entry) => Math.max(entry.views, entry.downloads)),
  );

  const viewsColor = theme.colors[theme.primaryColor][6];
  const downloadsColor = theme.colors.orange[6];

  const columnWidth = 100 / timeline.length;

  return (
    <Box>
      <svg
        viewBox={`0 0 100 ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label="Views and downloads per day"
      >
        {timeline.map((entry, i) => {
          const groupX = i * columnWidth;
          const barWidth = (columnWidth - BAR_GAP) / 2;
          const viewsHeight = (entry.views / maxValue) * (CHART_HEIGHT - 10);
          const downloadsHeight =
            (entry.downloads / maxValue) * (CHART_HEIGHT - 10);

          return (
            <g key={entry.date}>
              <title>
                {entry.date}: {entry.views} views, {entry.downloads} downloads
              </title>
              <rect
                x={groupX + BAR_GAP / 2}
                y={CHART_HEIGHT - viewsHeight}
                width={Math.max(barWidth, 0.1)}
                height={viewsHeight}
                fill={viewsColor}
                rx={0.5}
              />
              <rect
                x={groupX + BAR_GAP / 2 + barWidth}
                y={CHART_HEIGHT - downloadsHeight}
                width={Math.max(barWidth, 0.1)}
                height={downloadsHeight}
                fill={downloadsColor}
                rx={0.5}
              />
            </g>
          );
        })}
      </svg>
      <Group position="apart" mt="xs">
        <Text size="xs" color="dimmed">
          {timeline[0]?.date}
        </Text>
        <Group spacing={6}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: viewsColor,
            }}
          />
          <Text size="xs">{viewsLabel}</Text>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: 2,
              backgroundColor: downloadsColor,
              marginLeft: 8,
            }}
          />
          <Text size="xs">{downloadsLabel}</Text>
        </Group>
        <Text size="xs" color="dimmed">
          {timeline[timeline.length - 1]?.date}
        </Text>
      </Group>
    </Box>
  );
};

export default ShareAnalyticsChart;
