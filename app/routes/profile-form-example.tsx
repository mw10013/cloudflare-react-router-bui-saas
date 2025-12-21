import type { Route } from "./+types/profile-form-example";
import {
  createServerValidate,
  formOptions,
  initialFormState,
  mergeForm,
  ServerValidateError,
  useForm,
  useTransform,
} from "@tanstack/react-form-remix";
import { Form } from "react-router";
import { z } from "zod";

// Schema
const schema = z.object({
  username: z.string().min(3, "Min 3 chars"),
});

// Client form config
const formConfig = formOptions({
  defaultValues: { username: "" },
  validators: { onSubmit: schema },
});

// Server validation that always fails username
const serverValidate = createServerValidate({
  ...formConfig,
  onServerValidate: ({ value }) => {
    console.log(`onServerValidate: value: ${JSON.stringify(value)}`);
    if (value.username) {
      console.log(`onServerValidate: username present, returning error`);
      return { fields: { username: "That username is already taken." } };
    }
    console.log(`onServerValidate: no error`);
  },
});

// Action
export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    console.log(`formData: ${JSON.stringify(Object.fromEntries(formData))}`);
    console.log(`action: will serverValidate`);
    const validated = await serverValidate(formData);
    console.log(
      `action: did serverValidate: validated: ${JSON.stringify(validated)}`,
    );
    return validated;
  } catch (err) {
    if (err instanceof ServerValidateError) {
      console.log(
        `action: ServerValidateError: err.formState: ${JSON.stringify(
          err.formState,
        )}`,
        // err.formState.errorMap.onServer?.fields,
      );
      return err.formState;
    }

    console.error(err);
    throw err;
  }
}

// Component
export default function ProfileFormExample({
  actionData,
}: Route.ComponentProps) {
  const form = useForm({
    ...formConfig,
    transform: useTransform(
      (base) => mergeForm(base, actionData ?? initialFormState),
      [actionData],
    ),
  });

  return (
    <main style={{ padding: 16 }}>
      <Form method="post" onSubmit={() => form.handleSubmit()}>
        <form.Field
          name="username"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <div style={{ display: "grid", gap: 8, maxWidth: 360 }}>
                <label htmlFor={field.name}>Username</label>
                <input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                  }}
                  aria-invalid={isInvalid || undefined}
                />

                {isInvalid && field.state.meta.errors.length > 0 && (
                  <div className="text-destructive text-sm">
                    <pre>
                      {JSON.stringify(field.state.meta.errors, null, 2)}
                    </pre>
                  </div>
                )}

                <button type="submit" disabled={!form.state.canSubmit}>
                  Submit
                </button>

                <pre
                // style={{ fontSize: 12, background: "#f6f6f6", padding: 8 }}
                >
                  {JSON.stringify(
                    {
                      "field.meta.isTouched": field.state.meta.isTouched,
                      "field.meta.isValid": field.state.meta.isValid,
                      "field.meta.errors": field.state.meta.errors, // stays empty
                      "form.errorMap.onServer.fields":
                        form.state.errorMap.onServer?.fields ?? null, // contains { username: '...' }
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            );
          }}
        />
      </Form>
    </main>
  );
}
