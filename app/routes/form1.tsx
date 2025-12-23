// import type { Route } from "./+types/form1";
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

// import { z } from "zod";

// https://github.com/TanStack/form/issues/1704
// https://github.com/TanStack/form/discussions/1686

// const schema = z.object({
//   username: z.string().min(3, "Min 3 chars"),
// });

export default function RouteComponent() {
  const form = TanFormRemix.useForm({
    defaultValues: { age: 0 },
    // validators: { onSubmit: schema },
    validators: {
      onSubmit({ value }) {
        if (value.age < 5) {
          // return "form: onSubmit: Must be 5 or older to sign";
          return {
            form: "form: Must be 5 or older to sign",
            fields: {
              age: "form: field: Must be 5 or older to sign",
            },
          };
        }
        return undefined;
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
              {formErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Form Errors</AlertTitle>
                  <AlertDescription>
                    <pre className="mt-2 font-mono text-sm">
                      {JSON.stringify(formErrors, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}
              <form.Field
                name="age"
                validators={{
                  onBlur: ({ value }) =>
                    value < 0 ? "field: onBlur: < 0" : undefined,
                  onChange: ({ value }) =>
                    value < 3
                      ? "field: onChange: You must be 3 or older to make an account"
                      : undefined,
                }}
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
                        <FieldError
                          errors={field.state.meta.errors.map((error) => ({
                            message: error,
                          }))}
                        />
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
