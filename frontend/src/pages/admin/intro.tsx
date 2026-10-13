import {
  Anchor,
  Button,
  Center,
  Container,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import Link from "next/link";
import Logo from "../../components/Logo";
import Meta from "../../components/Meta";

const Intro = () => {
  return (
    <>
      <Meta title="Intro" />
      <Container size="xs">
        <Stack>
          <Center>
            <Logo height={80} width={80} />
          </Center>
          <Center>
            <Title order={2}>Welcome to VCPeer Send</Title>
          </Center>
          <Text>
            Share files with a link or by email — no account needed for
            recipients. Part of the{" "}
            <Anchor target="_blank" href="https://vcpeer.com">
              VCPeer
            </Anchor>{" "}
            suite.
          </Text>
          <Text mt="lg">How do you want to continue?</Text>
          <Stack>
            <Button href="/admin/config/general" component={Link}>
              Customize configuration
            </Button>
            <Button href="/" component={Link} variant="light">
              Explore VCPeer Send
            </Button>
          </Stack>
        </Stack>
      </Container>
    </>
  );
};

export default Intro;
