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
// easy to update as either product's free-tier limits change.
const COMPARISON_ROWS = [
  "account",
  "size",
  "expiry",
  "password",
  "ownership",
  "source",
] as const;

export default function WetransferAlternative() {
  const { classes } = useStyles();

  return (
    <>
      <Meta
        title="WeTransfer Alternative"
        description="A free, open-source WeTransfer alternative: no forced account, no 2 GB cap, and link expiry you control. Send large files in seconds."
        noIndex={false}
      />
      <Container size="md" className={classes.section}>
        <Title className={classes.title}>
          <FormattedMessage
            id="wetransferAlternative.title"
            values={{
              h: (chunks) => (
                <span className={classes.highlight}>{chunks}</span>
              ),
            }}
          />
        </Title>
        <Text color="dimmed" mt="md" size="lg" align="center">
          <FormattedMessage id="wetransferAlternative.description" />
        </Text>

        <Group position="center" mt={30}>
          <Button component={Link} href="/upload" radius="xl" size="md">
            <FormattedMessage id="wetransferAlternative.button.start" />
          </Button>
        </Group>
      </Container>

      <Container size="md" className={classes.section}>
        <Title order={2} align="center" mb="xl">
          <FormattedMessage id="wetransferAlternative.table.title" />
        </Title>

        <div className={classes.tableWrap}>
          <Table striped highlightOnHover withBorder>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="wetransferAlternative.table.feature" />
                </th>
                <th>
                  <FormattedMessage id="wetransferAlternative.table.us" />
                </th>
                <th>
                  <FormattedMessage id="wetransferAlternative.table.them" />
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row}>
                  <td>
                    <b>
                      <FormattedMessage
                        id={`wetransferAlternative.table.row.${row}.feature`}
                      />
                    </b>
                  </td>
                  <td>
                    <FormattedMessage
                      id={`wetransferAlternative.table.row.${row}.us`}
                    />
                  </td>
                  <td>
                    <FormattedMessage
                      id={`wetransferAlternative.table.row.${row}.them`}
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
          <FormattedMessage id="wetransferAlternative.faq.title" />
        </Title>

        <Accordion variant="separated">
          {[1, 2, 3, 4].map((n) => (
            <Accordion.Item key={n} value={`q${n}`}>
              <Accordion.Control>
                <FormattedMessage id={`wetransferAlternative.faq.q${n}`} />
              </Accordion.Control>
              <Accordion.Panel>
                <FormattedMessage id={`wetransferAlternative.faq.a${n}`} />
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>

      <Container size="sm" className={classes.section}>
        <Title order={3} align="center" mb="md">
          <FormattedMessage id="wetransferAlternative.related.title" />
        </Title>
        <Text color="dimmed" align="center" mb="xs">
          <FormattedMessage
            id="wetransferAlternative.related.live"
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
            id="wetransferAlternative.related.book"
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
