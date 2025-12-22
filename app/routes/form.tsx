import type { Route } from "./+types/form";
import * as React from "react";
import * as TanFormRemix from "@tanstack/react-form-remix";
import * as ReactRouter from "react-router";
import { z } from "zod";

// https://github.com/TanStack/form/issues/1704
// https://github.com/TanStack/form/discussions/1686

const schema = z.object({
  username: z.string().min(3, "Min 3 chars"),
});

const formConfig = TanFormRemix.formOptions({
  defaultValues: { username: "" },
  validators: { onSubmit: schema },
});

const serverValidate = TanFormRemix.createServerValidate({
  ...formConfig,
  onServerValidate: ({ value }) => {
    if (value.username) {
      return { fields: { username: "That username is already taken." } };
    }
  },
});

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    await serverValidate(formData);
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
  const form = TanFormRemix.useForm({
    ...formConfig,
    onSubmit: async ({ value }) => {
      await submit(value, { method: "POST" });
    },
  });

  React.useEffect(() => {
    if (actionData?.errorMap) {
      form.setErrorMap(actionData.errorMap);
    }
  }, [actionData, form]);

  // const formErrors = TanFormRemix.useStore(
  //   form.store,
  //   (formState) => formState.errors,
  // );

  const formLevelErrors = TanFormRemix.useStore(form.store, (formState) => {
    const toMessages = (error: unknown): readonly string[] => {
      if (!error) return [];
      if (typeof error === "string") return [error];
      if (TanFormRemix.isGlobalFormValidationError(error)) {
        const formError = error.form;
        if (!formError) return [];
        return [
          typeof formError === "string" ? formError : JSON.stringify(formError),
        ];
      }
      return [];
    };

    return [
      ...toMessages(formState.errorMap.onServer),
      ...toMessages(formState.errorMap.onSubmit),
    ];
  });

  return (
    <main style={{ padding: 16 }}>
      <ReactRouter.Form
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit({ submitTarget: e.currentTarget });
        }}
      >
        {formLevelErrors.length > 0 && (
          <h2>
            Form Errors:
            <pre>{JSON.stringify(formLevelErrors, null, 2)}</pre>
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
