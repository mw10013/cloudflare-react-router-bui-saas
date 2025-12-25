// import type { Route } from "./+types/form2";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import * as TanFormRemix from "@tanstack/react-form-remix";
import { AlertCircle } from "lucide-react";
import * as ReactRouter from "react-router";
import z from "zod";

// https://github.com/TanStack/form/issues/1704
// https://github.com/TanStack/form/discussions/1686

const schema = z.object({
  age: z.number().gte(3, "zod: You must be 3 or older to make an account"),
});

export default function RouteComponent() {
  const form = TanFormRemix.useForm({
    defaultValues: { age: 0 },
    validators: {
      onSubmit: ({ value, formApi }) => {
        // parseValuesWithSchema will populate form property with any field errors.
        const issues = formApi.parseValuesWithSchema(schema);
        if (issues) {
          // https://tanstack.com/form/latest/docs/framework/react/guides/validation#setting-field-level-errors-from-the-forms-validators
          return { fields: issues.fields };
        }
        if (value.age < 5) {
          return {
            form: "form: Must be 5 or older to sign",
            fields: {},
          };
        }
      },
    },
    onSubmit: ({ value }) => {
      console.log(`onSubmit: value: ${JSON.stringify(value)}`);
    },
  });

  const formErrors = TanFormRemix.useStore(
    form.store,
    (formState) => formState.errors,
  );

  return (
    <main className="p-4">
      <Card className="w-full sm:max-w-md">
        <CardHeader>
          <CardTitle>Age Verification</CardTitle>
          <CardDescription>
            Please enter your age to verify eligibility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReactRouter.Form
            id="age-verification-form"
            method="post"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Subscribe selector={(formState) => formState.errors}>
                {(formErrors) =>
                  formErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>Form Errors</AlertTitle>
                      <AlertDescription>
                        <ul className="ml-4 flex list-disc flex-col gap-1">
                          {formErrors.map(
                            (error, index) =>
                              error && <li key={index}>{error}</li>,
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )
                }
              </form.Subscribe>
              <form.Field
                name="age"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Age</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="number"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.valueAsNumber);
                        }}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && field.state.meta.errors.length > 0 && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                      <pre className="text-sm">
                        {JSON.stringify(
                          {
                            "field.state": field.state,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </Field>
                  );
                }}
              />
            </FieldGroup>
          </ReactRouter.Form>
        </CardContent>
        <CardFooter>
          <FieldGroup>
            <Field orientation="horizontal">
              <form.Subscribe
                selector={(formState) => [
                  formState.canSubmit,
                  formState.isSubmitting,
                ]}
              >
                {([canSubmit, isSubmitting]) => (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        form.reset();
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      form="age-verification-form"
                      disabled={!canSubmit}
                    >
                      {isSubmitting ? "..." : "Submit"}
                    </Button>
                  </>
                )}
              </form.Subscribe>
            </Field>
            <pre className="text-sm">
              {JSON.stringify(
                {
                  formErrors,
                },
                null,
                2,
              )}
            </pre>
          </FieldGroup>
        </CardFooter>
      </Card>
    </main>
  );
}
