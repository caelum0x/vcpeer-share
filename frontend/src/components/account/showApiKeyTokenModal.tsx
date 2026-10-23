import { Alert, Button, CopyButton, Group, Stack, TextInput } from "@mantine/core";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { TbAlertTriangle, TbCheck, TbCopy } from "react-icons/tb";
import { translateOutsideContext } from "../../hooks/useTranslate.hook";

const showApiKeyTokenModal = (modals: ModalsContextProps, token: string) => {
  const t = translateOutsideContext();

  return modals.openModal({
    title: t("account.apiKeys.modal.token.title"),
    closeOnClickOutside: false,
    withCloseButton: false,
    children: (
      <Stack>
        <Alert icon={<TbAlertTriangle />} color="orange" variant="light">
          {t("account.apiKeys.modal.token.warning")}
        </Alert>
        <TextInput variant="filled" value={token} readOnly />
        <CopyButton value={token} timeout={2000}>
          {({ copied, copy }) => (
            <Button
              fullWidth
              color={copied ? "teal" : undefined}
              onClick={copy}
              leftIcon={copied ? <TbCheck /> : <TbCopy />}
            >
              {copied
                ? t("account.apiKeys.modal.token.copied")
                : t("account.apiKeys.modal.token.copy")}
            </Button>
          )}
        </CopyButton>
        <Group position="right">
          <Button variant="subtle" onClick={() => modals.closeAll()}>
            {t("account.apiKeys.modal.token.done")}
          </Button>
        </Group>
      </Stack>
    ),
  });
};

export default showApiKeyTokenModal;
