// import type { Route } from "./+types/form1";
import * as TanFormRemix from "@tanstack/react-form-remix";
import * as ReactRouter from "react-router";
import { z } from "zod";

// https://github.com/TanStack/form/issues/1704
// https://github.com/TanStack/form/discussions/1686

const schema = z.object({
  username: z.string().min(3, "Min 3 chars"),
});

export default function RouteComponent() {
  const form = TanFormRemix.useForm({
    defaultValues: { username: "" },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      console.log(`onSubmit: value: ${JSON.stringify(value)}`);
    },
  });

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
          void form.handleSubmit();
        }}
      >
        {/* {formErrors.length > 0 && (
          <h2>
            Form Errors (all):
            <pre>{JSON.stringify(formErrors, null, 2)}</pre>
          </h2>
        )}
        {formErrors.length > 0 && (
          <h2>
            Form Errors (individual):
            {formErrors.map((error) => (
              <pre>{JSON.stringify(error, null, 2)}</pre>
            ))}
          </h2>
        )} */}

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
                  // onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value);
                  }}
                  aria-invalid={isInvalid || undefined}
                  className="rounded border px-2 py-1"
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
                      formErrors,
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
