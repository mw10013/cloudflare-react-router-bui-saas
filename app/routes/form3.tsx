import type { Route } from "./+types/form3";
import * as React from "react";
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
  age: z.number().gte(3, "You must be 3 or older to make an account."),
});

const formConfig = TanFormRemix.formOptions({
  defaultValues: { age: 0 },
});

const serverValidate = TanFormRemix.createServerValidate({
  ...formConfig,
  onServerValidate: ({ value }) => {
    console.log(
      `onServerValidate: value: ${JSON.stringify({ value, type: typeof value.age })}`,
    );
    if (value.age === 13) {
      return {
        form: "server: form: Unlucky age.",
        fields: { age: { message: "server: field: That age is unlucky." } },
      };
    }
  },
});

export async function action({ request }: Route.ActionArgs) {
  try {
    const formData = await request.formData();
    console.log(
      `action: formData: ${JSON.stringify(Object.fromEntries(formData))}`,
    );
    await serverValidate(formData, ({ path, output }) =>
      path === "age" && typeof output === "string" ? Number(output) : output,
    );
    return null;
  } catch (error) {
    if (error instanceof TanFormRemix.ServerValidateError) {
      console.log(
        `action: ServerValidateError: error.formState: ${JSON.stringify(
          error.formState,
        )}`,
      );
      return error.formState;
    }
    console.error(error);
    throw error;
  }
}

export default function RouteComponent({ actionData }: Route.ComponentProps) {
  const submit = ReactRouter.useSubmit();
  const form = TanFormRemix.useForm({
    ...formConfig,
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
            form: "You must be 5 or older to sign up.",
            fields: {},
          };
        }
      },
    },
    onSubmit: async ({ value }) => {
      console.log(`onSubmit: value: ${JSON.stringify(value)}`);
      await submit(value, { method: "POST" });
    },
  });

  React.useEffect(() => {
    if (actionData?.errorMap) {
      form.setErrorMap(actionData.errorMap);
    }
  }, [actionData, form]);

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
                        onChange={(e) => {
                          field.handleChange(e.target.valueAsNumber);
                        }}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && field.state.meta.errors.length > 0 && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
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
          </FieldGroup>
        </CardFooter>
      </Card>
    </main>
  );
}
