import type { Route } from "./+types/login";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { RequestContext } from "@/lib/request-context";
import { invariant } from "@epic-web/invariant";
import * as TanFormRemix from "@tanstack/react-form-remix";
import * as ReactRouter from "react-router";
import z from "zod";

export function loader({ context }: Route.LoaderArgs) {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { env } = requestContext;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return { isDemoMode: env.DEMO_MODE === "true" };
}

export async function action({ request, context }: Route.ActionArgs) {
  const schema = z.object({
    email: z.email(),
  });
  const parseResult = schema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parseResult.success) {
    const { formErrors, fieldErrors } = z.flattenError(parseResult.error);
    const errorMap = {
      onSubmit: {
        ...(formErrors.length > 0 ? { form: formErrors.join(", ") } : {}),
        fields: Object.entries(fieldErrors).reduce<
          Record<string, { message: string }[]>
        >((acc, [key, messages]) => {
          acc[key] = messages.map((message) => ({ message }));
          return acc;
        }, {}),
      },
    };
    return { success: false, errorMap };
  }
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { authService: auth, env } = requestContext;
  const result = await auth.api.signInMagicLink({
    headers: request.headers,
    body: { email: parseResult.data.email, callbackURL: "/magic-link" },
  });
  invariant(
    result.status,
    "Expected signInMagicLink to throw error on failure",
  );
  const magicLink =
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    env.DEMO_MODE === "true"
      ? ((await env.KV.get(`demo:magicLink`)) ?? undefined)
      : undefined;
  console.log("magicLink", magicLink);
  return { success: true, magicLink };
}

export default function RouteComponent({
  loaderData: { isDemoMode },
  actionData,
}: Route.ComponentProps) {
  const submit = ReactRouter.useSubmit();
  const form = TanFormRemix.useForm({
    ...TanFormRemix.formOptions({
      defaultValues: { email: "" },
    }),
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
  if (actionData?.success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              If an account exists for that email, a magic sign-in link has been
              sent.
            </CardDescription>
          </CardHeader>
        </Card>
        {actionData.magicLink && (
          <div className="mt-4">
            {/* <a> used to bypass react router routing and hit the api endpoint directly */}
            <a href={actionData.magicLink} className="block">
              {actionData.magicLink}
            </a>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in / Sign up</CardTitle>
          <CardDescription>
            {isDemoMode
              ? "DEMO MODE: no transactional emails. Use fake email or a@a.com for admin."
              : "Enter your email to receive a magic sign-in link"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReactRouter.Form
            id="login-form"
            method="post"
            onSubmit={(e) => {
              e.preventDefault();
              void form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field
                name="email"
                children={(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid || undefined}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                        }}
                        placeholder="m@example.com"
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              />
              <form.Subscribe
                selector={(formState) => [
                  formState.canSubmit,
                  formState.isSubmitting,
                ]}
              >
                {([canSubmit, isSubmitting]) => (
                  <Button
                    type="submit"
                    form="login-form"
                    disabled={!canSubmit}
                    className="w-full"
                  >
                    {isSubmitting ? "..." : "Send magic link"}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </ReactRouter.Form>
        </CardContent>
      </Card>
    </div>
  );
}
