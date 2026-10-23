import { Button, Select, Stack, TextInput } from "@mantine/core";
import { useForm, yupResolver } from "@mantine/form";
import { ModalsContextProps } from "@mantine/modals/lib/context";
import { FormattedMessage } from "react-intl";
import * as yup from "yup";
import useTranslate, {
  translateOutsideContext,
} from "../../hooks/useTranslate.hook";
import apiKeyService from "../../services/apiKey.service";
import toast from "../../utils/toast.util";
import showApiKeyTokenModal from "./showApiKeyTokenModal";

const EXPIRY_OPTIONS = ["30", "90", "365", "0"];

const showCreateApiKeyModal = (
  modals: ModalsContextProps,
  onCreated: () => void,
) => {
  const t = translateOutsideContext();

  return modals.openModal({
    title: t("account.apiKeys.modal.create.title"),
    children: <Body modals={modals} onCreated={onCreated} />,
  });
};

const Body = ({
  modals,
  onCreated,
}: {
  modals: ModalsContextProps;
  onCreated: () => void;
}) => {
  const t = useTranslate();

  const form = useForm({
    initialValues: {
      name: "",
      expiresInDays: "90",
    },
    validate: yupResolver(
      yup.object().shape({
        name: yup
          .string()
          .trim()
          .min(1, t("common.error.field-required"))
          .max(50, t("common.error.too-long", { length: 50 })),
      }),
    ),
  });

  const onSubmit = form.onSubmit(async (values) => {
    try {
      const apiKey = await apiKeyService.create(
        values.name.trim(),
        parseInt(values.expiresInDays) || undefined,
      );
      modals.closeAll();
      onCreated();
      showApiKeyTokenModal(modals, apiKey.token);
    } catch (e) {
      toast.axiosError(e);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <Stack>
        <TextInput
          label={t("account.apiKeys.modal.create.name")}
          placeholder={t("account.apiKeys.modal.create.name-placeholder")}
          data-autofocus
          {...form.getInputProps("name")}
        />
        <Select
          label={t("account.apiKeys.modal.create.expiry")}
          data={EXPIRY_OPTIONS.map((days) => ({
            value: days,
            label:
              days === "0"
                ? t("account.apiKeys.modal.create.expiry.never")
                : t("account.apiKeys.modal.create.expiry.days", {
                    days,
                  }),
          }))}
          {...form.getInputProps("expiresInDays")}
        />
        <Button type="submit" fullWidth mt="sm">
          <FormattedMessage id="common.button.create" />
        </Button>
      </Stack>
    </form>
  );
};

export default showCreateApiKeyModal;
