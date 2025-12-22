import type { Route } from "./+types/profile-form-example";
import * as React from "react";
import * as TanFormRemix from "@tanstack/react-form-remix";
import * as ReactRouter from "react-router";
import { z } from "zod";

// https://github.com/TanStack/form/issues/1704

const schema = z.object({
  username: z.string().min(3, "Min 3 chars"),
});

const formConfig = TanFormRemix.formOptions({
  defaultValues: { username: "" },
  validators: { onSubmit: schema },
});

// Server validation that always fails username
const serverValidate = TanFormRemix.createServerValidate({
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

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    console.log(
      `action: will serverValidate: formData: ${JSON.stringify(Object.fromEntries(formData))}`,
    );
    const validated = await serverValidate(formData);
    console.log(
      `action: did serverValidate: validated: ${JSON.stringify(validated)}`,
    );
    return null;
  } catch (err) {
    if (err instanceof TanFormRemix.ServerValidateError) {
      console.log(
        `action: ServerValidateError: err.formState: ${JSON.stringify(
          err.formState,
        )}`,
      );
      return err.formState;
    }

    console.error(err);
    throw err;
  }
}

export default function ProfileFormExample({
  actionData,
}: Route.ComponentProps) {
  const submit = ReactRouter.useSubmit();
  const onSubmitMeta: { readonly formEl?: HTMLFormElement } = {};
  const form = TanFormRemix.useForm({
    ...formConfig,
    onSubmitMeta,
    onSubmit: ({ meta }) => {
      if (!meta.formEl) return;
      void submit(meta.formEl);
    },
  });

  React.useEffect(() => {
    if (actionData?.errorMap) {
      form.setErrorMap(actionData.errorMap);
    }
  }, [actionData, form]);

  const formErrors = TanFormRemix.useStore(
    form.store,
    (formState) => formState.errors,
  );

  return (
    <main style={{ padding: 16 }}>
      <ReactRouter.Form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit({ formEl: e.currentTarget });
        }}
      >
        {formErrors.length > 0 && (
          <h2>
            Form Errors:
            <pre>{JSON.stringify(formErrors, null, 2)}</pre>
          </h2>
        )}
        {/* {formErrors.map((error) => (
          <p key={error as never as string}>{error}</p>
        ))} */}

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

                <pre>
                  {JSON.stringify(
                    {
                      actionData,
                      "field.state": field.state,
                      "form.state": form.state,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            );
          }}
        />
      </ReactRouter.Form>
    </main>
  );
}
