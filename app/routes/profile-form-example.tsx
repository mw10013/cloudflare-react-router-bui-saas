import type { Route } from "./+types/profile-form-example";
import {
  mergeForm,
  useForm,
  useTransform,
  createServerValidate,
  formOptions,
  initialFormState,
  ServerValidateError,
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
    if (value.username) {
      return { fields: { username: "That username is already taken." } };
    }
  },
});

// Action
export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    const validated = await serverValidate(formData);
    return validated;
  } catch (err) {
    if (err instanceof ServerValidateError) {
      console.log(
        "server errorMap.onServer.fields:",
        err.formState.errorMap.onServer?.fields,
      );
      return err.formState;
    }
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
      <Form method="post" onSubmit={() => void form.handleSubmit()}>
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
                  <p style={{ color: "crimson" }}>
                    {field.state.meta.errors.join(", ")}
                  </p>
                )}

                <button type="submit">Submit</button>

                <pre
                  style={{ fontSize: 12, background: "#f6f6f6", padding: 8 }}
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
