import type {
  StandardSchemaV1,
  StandardSchemaV1Issue,
} from "@tanstack/react-form";
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

const schema1 = z.object({
  age: z.number().gte(7, "You must be 7 or older to make an account."),
});

const formConfig = TanFormRemix.formOptions({
  defaultValues: { age: 0 },
});

/**
 * Parses a form value against a Standard Schema V1 and returns field-level validation issues.
 *
 * This function mirrors the behavior of TanStack Form's `FormApi.parseValuesWithSchema` but is designed
 * for server-side use where a `FormApi` instance is not available. It validates the provided value
 * against the schema, extracts validation issues, and normalizes their paths into string keys
 * (e.g., "age", "users[0].name") suitable for TanStack Form's error mapping.
 *
 * @param value - The form data value to validate.
 * @param schema - A Standard Schema V1 compliant schema (e.g., from Zod).
 * @returns An object with a `fields` record mapping field paths to arrays of issues, or `undefined` if no issues.
 * @throws Error if the schema validation returns a Promise (async schemas are not supported).
 *
 * @example
 * const issues = parseValueWithSchema({ age: 2 }, z.object({ age: z.number().gte(3) }));
 * // Returns: { fields: { age: [{ message: "Number must be greater than or equal to 3" }] } }
 *
 * This is needed because TanStack Form's `FormApi.parseValuesWithSchema` requires a client-side FormApi,
 * but server-side validation (e.g., in Remix actions) needs a standalone way to validate and format errors
 * for integration with TanStack Form's error handling system.
 */
function parseValueWithSchema<TFormData>(
  value: TFormData,
  schema: StandardSchemaV1<TFormData, unknown>,
):
  | {
      readonly fields: Record<string, StandardSchemaV1Issue[]>;
    }
  | undefined {
  const result = schema["~standard"].validate(value);
  if (result instanceof Promise) {
    throw new Error(
      "parseValueWithSchema received an async Standard Schema. Use an async variant instead.",
    );
  }
  const issues = result.issues;
  if (!issues || issues.length === 0) return;

  const errorMap: Record<string, StandardSchemaV1Issue[]> = {};

  // Examples of path normalization:
  // - issue.path = ["age"] → path = "age"
  // - issue.path = ["user", "name"] → path = "user.name"
  // - issue.path = ["users", 0, "name"] → path = "users[0].name"
  // - issue.path = ["items", 1, "details", "id"] → path = "items[1].details.id"
  for (const issue of issues) {
    // Normalize the issue's path array into a string key (e.g., "age" or "users[0].name")
    // This matches TanStack Form's field naming convention for error mapping
    const issuePath = issue.path ?? [];
    let currentValue: unknown = value;
    let path = "";

    // Traverse the path segments to build the string path and validate structure
    for (const pathSegment of issuePath) {
      // Extract the segment key (handles both string/number and object with key property)
      const segment =
        typeof pathSegment === "object" ? pathSegment.key : pathSegment;

      // Check if this segment represents an array index
      const segmentAsNumber = Number(segment);
      if (Array.isArray(currentValue) && !Number.isNaN(segmentAsNumber)) {
        // Append array notation (e.g., "[0]") and navigate to the array element
        path += `[${String(segmentAsNumber)}]`;
        currentValue = currentValue[segmentAsNumber];
        continue;
      }

      // Append object property notation (e.g., ".name") and navigate to the property
      path += path.length > 0 ? `.${String(segment)}` : String(segment);
      currentValue =
        typeof currentValue === "object" && currentValue !== null
          ? (currentValue as Record<string, unknown>)[String(segment)]
          : undefined;
    }

    // Only add issues with a valid path (skip root-level issues)
    if (path.length > 0) {
      errorMap[path] ??= [];
      errorMap[path].push(issue);
    }
  }

  return {
    fields: errorMap,
  };
}

const serverValidate = TanFormRemix.createServerValidate({
  ...formConfig,
  onServerValidate: ({ value }) => {
    console.log(`onServerValidate: value: ${JSON.stringify({ value })}`);
    const issues = parseValueWithSchema(value, schema1);
    console.log(
      `onServerValidate: schema1 issues: ${JSON.stringify({ issues })}`,
    );
    return issues;
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
                        onBlur={field.handleBlur}
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
