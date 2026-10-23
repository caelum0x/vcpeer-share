import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Stack,
  Table,
  Text,
  Title,
  Button,
} from "@mantine/core";
import { useModals } from "@mantine/modals";
import moment from "moment";
import { useEffect, useState } from "react";
import { TbInfoCircle, TbKey, TbPlus, TbTrash } from "react-icons/tb";
import { FormattedMessage } from "react-intl";
import Meta from "../../components/Meta";
import showCreateApiKeyModal from "../../components/account/showCreateApiKeyModal";
import { HoverTip } from "../../components/core/HoverTip";
import CenterLoader from "../../components/core/CenterLoader";
import apiKeyService from "../../services/apiKey.service";
import useTranslate from "../../hooks/useTranslate.hook";
import { ApiKey } from "../../types/apiKey.type";
import toast from "../../utils/toast.util";

const ApiKeys = () => {
  const modals = useModals();
  const t = useTranslate();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>();

  const getApiKeys = () => {
    apiKeyService.list().then(setApiKeys).catch(toast.axiosError);
  };

  useEffect(() => {
    getApiKeys();
  }, []);

  if (!apiKeys) return <CenterLoader />;

  return (
    <>
      <Meta title={t("account.apiKeys.title")} />
      <Group position="apart" align="baseline" mb={20}>
        <Group align="center" spacing={3} mb={30}>
          <Title order={3}>
            <FormattedMessage id="account.apiKeys.title" />
          </Title>
          <HoverTip label={t("account.apiKeys.description")}>
            <ActionIcon color="blue">
              <TbInfoCircle />
            </ActionIcon>
          </HoverTip>
        </Group>
        <Button
          onClick={() => showCreateApiKeyModal(modals, getApiKeys)}
          leftIcon={<TbPlus size={20} />}
        >
          <FormattedMessage id="common.button.create" />
        </Button>
      </Group>
      {apiKeys.length === 0 ? (
        <Center style={{ height: "60vh" }}>
          <Stack align="center" spacing={10}>
            <TbKey size={40} />
            <Title order={3}>
              <FormattedMessage id="account.apiKeys.title.empty" />
            </Title>
            <Text align="center" color="dimmed">
              <FormattedMessage id="account.apiKeys.description.empty" />
            </Text>
          </Stack>
        </Center>
      ) : (
        <Box sx={{ display: "block", overflowX: "auto" }}>
          <Table>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="account.apiKeys.table.name" />
                </th>
                <th>
                  <FormattedMessage id="account.apiKeys.table.created" />
                </th>
                <th>
                  <FormattedMessage id="account.apiKeys.table.last-used" />
                </th>
                <th>
                  <FormattedMessage id="account.apiKeys.table.expires" />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((apiKey) => {
                const isExpired =
                  !!apiKey.expiresAt &&
                  moment(apiKey.expiresAt).isBefore(moment());
                return (
                  <tr key={apiKey.id}>
                    <td>
                      <Group spacing={6}>
                        <Text size="sm">{apiKey.name}</Text>
                        {isExpired && (
                          <Badge color="red" size="xs">
                            <FormattedMessage id="account.apiKeys.table.expired" />
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" color="dimmed" ff="monospace">
                        vcp_{apiKey.keyId}&hellip;
                      </Text>
                    </td>
                    <td>{moment(apiKey.createdAt).format("LLL")}</td>
                    <td>
                      {apiKey.lastUsedAt ? (
                        moment(apiKey.lastUsedAt).format("LLL")
                      ) : (
                        <Text color="dimmed" size="sm">
                          <FormattedMessage id="account.apiKeys.table.never-used" />
                        </Text>
                      )}
                    </td>
                    <td>
                      {apiKey.expiresAt ? (
                        moment(apiKey.expiresAt).format("LLL")
                      ) : (
                        <FormattedMessage id="account.apiKeys.table.no-expiry" />
                      )}
                    </td>
                    <td>
                      <Group position="right">
                        <HoverTip label={t("common.button.delete")}>
                          <ActionIcon
                            color="red"
                            variant="light"
                            size={25}
                            onClick={() => {
                              modals.openConfirmModal({
                                title: t(
                                  "account.apiKeys.modal.revoke.title",
                                ),
                                children: (
                                  <Text size="sm">
                                    <FormattedMessage id="account.apiKeys.modal.revoke.description" />
                                  </Text>
                                ),
                                confirmProps: { color: "red" },
                                labels: {
                                  confirm: t("common.button.delete"),
                                  cancel: t("common.button.cancel"),
                                },
                                onConfirm: () => {
                                  apiKeyService
                                    .revoke(apiKey.id)
                                    .then(() =>
                                      setApiKeys(
                                        apiKeys.filter(
                                          (item) => item.id !== apiKey.id,
                                        ),
                                      ),
                                    )
                                    .catch(toast.axiosError);
                                },
                              });
                            }}
                          >
                            <TbTrash />
                          </ActionIcon>
                        </HoverTip>
                      </Group>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Box>
      )}
    </>
  );
};

export default ApiKeys;
