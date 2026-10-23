import {
  Accordion,
  Anchor,
  Button,
  Container,
  createStyles,
  Group,
  Table,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";

const useStyles = createStyles((theme) => ({
  title: {
    color: theme.colorScheme === "dark" ? theme.white : theme.black,
    fontSize: 40,
    lineHeight: 1.2,
    fontWeight: 900,
    textAlign: "center",

    [theme.fn.smallerThan("xs")]: {
      fontSize: 28,
    },
  },

  highlight: {
    position: "relative",
    backgroundColor:
      theme.colorScheme === "dark"
        ? theme.fn.rgba(theme.colors[theme.primaryColor][6], 0.55)
        : theme.colors[theme.primaryColor][0],
    borderRadius: theme.radius.sm,
    padding: "4px 12px",
  },

  section: {
    paddingTop: `calc(${theme.spacing.xl} * 2)`,
    paddingBottom: `calc(${theme.spacing.xl} * 2)`,
  },

  tableWrap: {
    overflowX: "auto",
  },
}));

// Table rows are declared here (not hardcoded JSX) so the comparison stays
// easy to update as either product's free-tier limits change. "password"
// and "views" are SwissTransfer's named, verifiable weaknesses from
// STRATEGY-2026-10-23.md section 1: no password protection and no visitor
// limits at any price, despite its larger 50 GB cap.
const COMPARISON_ROWS = [
  "account",
  "size",
  "password",
  "views",
  "ownership",
  "source",
] as const;

export default function SwisstransferAlternative() {
  const { classes } = useStyles();

  return (
    <>
      <Meta
        title="SwissTransfer Alternative"
        description="A free, open-source SwissTransfer alternative with password protection and visitor limits SwissTransfer doesn't offer at any price."
        noIndex={false}
      />
      <Container size="md" className={classes.section}>
        <Title className={classes.title}>
          <FormattedMessage
            id="swisstransferAlternative.title"
            values={{
              h: (chunks) => (
                <span className={classes.highlight}>{chunks}</span>
              ),
            }}
          />
        </Title>
        <Text color="dimmed" mt="md" size="lg" align="center">
          <FormattedMessage id="swisstransferAlternative.description" />
        </Text>

        <Group position="center" mt={30}>
          <Button component={Link} href="/upload" radius="xl" size="md">
            <FormattedMessage id="swisstransferAlternative.button.start" />
          </Button>
        </Group>
      </Container>

      <Container size="md" className={classes.section}>
        <Title order={2} align="center" mb="xl">
          <FormattedMessage id="swisstransferAlternative.table.title" />
        </Title>

        <div className={classes.tableWrap}>
          <Table striped highlightOnHover withBorder>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="swisstransferAlternative.table.feature" />
                </th>
                <th>
                  <FormattedMessage id="swisstransferAlternative.table.us" />
                </th>
                <th>
                  <FormattedMessage id="swisstransferAlternative.table.them" />
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row}>
                  <td>
                    <b>
                      <FormattedMessage
                        id={`swisstransferAlternative.table.row.${row}.feature`}
                      />
                    </b>
                  </td>
                  <td>
                    <FormattedMessage
                      id={`swisstransferAlternative.table.row.${row}.us`}
                    />
                  </td>
                  <td>
                    <FormattedMessage
                      id={`swisstransferAlternative.table.row.${row}.them`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Container>

      <Container size="sm" className={classes.section}>
        <Title order={2} align="center" mb="xl">
          <FormattedMessage id="swisstransferAlternative.faq.title" />
        </Title>

        <Accordion variant="separated">
          {[1, 2, 3, 4].map((n) => (
            <Accordion.Item key={n} value={`q${n}`}>
              <Accordion.Control>
                <FormattedMessage id={`swisstransferAlternative.faq.q${n}`} />
              </Accordion.Control>
              <Accordion.Panel>
                <FormattedMessage id={`swisstransferAlternative.faq.a${n}`} />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>

      <Container size="sm" className={classes.section}>
        <Title order={3} align="center" mb="md">
          <FormattedMessage id="swisstransferAlternative.related.title" />
        </Title>
        <Text color="dimmed" align="center" mb="xs">
          <FormattedMessage
            id="swisstransferAlternative.related.live"
            values={{
              a: (chunks) => (
                <Anchor href="https://live.vcpeer.com" target="_blank">
                  {chunks}
                </Anchor>
              ),
            }}
          />
        </Text>
        <Text color="dimmed" align="center">
          <FormattedMessage
            id="swisstransferAlternative.related.book"
            values={{
              a: (chunks) => (
                <Anchor
                  href="https://book.vcpeer.com/admin/30min"
                  target="_blank"
                >
                  {chunks}
                </Anchor>
              ),
            }}
          />
        </Text>
      </Container>
    </>
  );
}
