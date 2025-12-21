import type { Route } from "./+types/app.$organizationId.invitations";
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as Domain from "@/lib/domain";
import { RequestContext } from "@/lib/request-context";
import { invariant } from "@epic-web/invariant";
import { useForm } from "@tanstack/react-form";
import * as ReactRouter from "react-router";
import * as z from "zod";

const inviteSchema = z.object({
  emails: z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.email("Please provide valid email addresses."))
        .min(1, "At least one email is required")
        .max(10, "Maximum 10 emails allowed"),
    ),
  role: Domain.MemberRole.extract(
    ["member", "admin"],
    "Role must be Member or Admin.",
  ),
});

export async function loader({
  request,
  context,
  params: { organizationId },
}: Route.LoaderArgs) {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { authService: auth } = requestContext;

  const { success: canManageInvitations } = await auth.api.hasPermission({
    headers: request.headers,
    body: {
      organizationId,
      permissions: {
        invitation: ["create", "cancel"],
      },
    },
  });

  return {
    canManageInvitations,
    invitations: await auth.api.listInvitations({
      headers: request.headers,
      query: {
        organizationId,
      },
    }),
  };
}

export async function action({
  request,
  context,
  params: { organizationId },
}: Route.ActionArgs): Promise<Oui.AlertFormActionResult> {
  const schema = z.discriminatedUnion("intent", [
    z.object({
      intent: z.literal("cancel"),
      invitationId: z.string().min(1, "Missing invitationId"),
    }),
    z.object({
      intent: z.literal("invite"),
      emails: z
        .string()
        .transform((v) =>
          v
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean),
        )
        .pipe(
          z
            .array(z.email("Please provide valid email addresses."))
            .min(1, "At least one email is required")
            .max(10, "Maximum 10 emails allowed"),
        ),
      role: Domain.MemberRole.extract(
        ["member", "admin"],
        "Role must be Member or Admin.",
      ),
    }),
  ]);

  const parseResult = schema.safeParse(
    Object.fromEntries(await request.formData()),
  );
  if (!parseResult.success) {
    const { formErrors: details, fieldErrors: validationErrors } =
      z.flattenError(parseResult.error);
    return { success: false, details, validationErrors };
  }
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { authService: auth, repository } = requestContext;
  switch (parseResult.data.intent) {
    case "cancel":
      await auth.api.cancelInvitation({
        headers: request.headers,
        body: { invitationId: parseResult.data.invitationId },
      });
      return { success: true };
    case "invite":
      for (const email of parseResult.data.emails) {
        const result = await auth.api.createInvitation({
          headers: request.headers,
          body: {
            email,
            role: parseResult.data.role,
            organizationId,
            resend: true,
          },
        });
        // Workaround for better-auth createInvitation role bug.
        // Occurs when a pending invitation exists and a new invitation is created with a different role.
        if (result.role !== parseResult.data.role) {
          console.log(
            `Applying workaround for better-auth createInvitation role bug: expected role ${parseResult.data.role}, got ${String(result.role)} for invitation ${String(result.id)}`,
          );
          await repository.updateInvitationRole({
            invitationId: Number(result.id),
            role: parseResult.data.role,
          });
        }
      }
      return { success: true };
    default:
      void (parseResult.data satisfies never);
      throw new Error("Unknown intent");
  }
}

export default function RouteComponent({
  loaderData: { canManageInvitations, invitations },
  actionData,
}: Route.ComponentProps) {
  const submit = ReactRouter.useSubmit();
  const formRef = React.useRef<HTMLFormElement>(null);
  const form = useForm({
    defaultValues: {
      emails: "",
      role: "member" as "member" | "admin",
    },
    validators: {
      onBlur: inviteSchema,
    },
  });

  // Reset form after successful invite
  React.useEffect(() => {
    if (actionData?.success) {
      formRef.current?.reset();
    }
  }, [actionData]);

  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
        <p className="text-muted-foreground text-sm">
          Invite new members and manage your invitations.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Invite New Members</CardTitle>
          <CardDescription>
            Enter email addresses separated by commas to send invitations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            id="invite-form"
            onSubmit={(e) => {
              e.preventDefault();
              const nativeEvent = e.nativeEvent;
              const submitter =
                nativeEvent instanceof SubmitEvent &&
                (nativeEvent.submitter instanceof HTMLButtonElement ||
                  nativeEvent.submitter instanceof HTMLInputElement)
                  ? nativeEvent.submitter
                  : null;
              void submit(submitter ?? e.currentTarget, { method: "post" });
            }}
            className="grid"
          >
            <FieldGroup>
              <form.Field name="emails">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel>Email Addresses</FieldLabel>
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                        }}
                        onBlur={field.handleBlur}
                        placeholder="user1@example.com, user2@example.com"
                        disabled={!canManageInvitations}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="role">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid} className="w-fit">
                      <FieldLabel>Role</FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={field.handleChange}
                        disabled={!canManageInvitations}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <Button
                type="submit"
                name="intent"
                value="invite"
                disabled={!canManageInvitations || form.state.isSubmitting}
                className="self-end"
              >
                Invite
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Review and manage invitations sent for this organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <div
              aria-label="Organization invitations"
              data-testid="invitations-list"
            >
              {invitations.map((i) => (
                <InvitationItem
                  key={i.id}
                  invitation={i}
                  canManageInvitations={canManageInvitations}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No invitations have been sent for this organization yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InvitationItem({
  invitation,
  canManageInvitations,
}: {
  invitation: Route.ComponentProps["loaderData"]["invitations"][number];
  canManageInvitations: boolean;
}) {
  const fetcher = ReactRouter.useFetcher<Route.ComponentProps["actionData"]>();
  const pending = fetcher.state !== "idle";
  return (
    <Item size="sm" className="gap-4 px-0">
      <ItemContent>
        <ItemTitle>{invitation.email}</ItemTitle>
        <ItemDescription>
          {invitation.role} — {invitation.status}
          {invitation.status === "pending" && (
            <>
              <br />
              <span className="text-xs">
                Expires:{" "}
                {new Date(invitation.expiresAt)
                  .toISOString()
                  .replace("T", " ")
                  .slice(0, 16)}{" "}
                UTC
              </span>
            </>
          )}
        </ItemDescription>
      </ItemContent>
      {canManageInvitations && invitation.status === "pending" && (
        <ItemActions>
          <fetcher.Form method="post">
            <input type="hidden" name="invitationId" value={invitation.id} />
            <Button
              type="submit"
              name="intent"
              value="cancel"
              variant="outline"
              size="sm"
              aria-label={`Cancel invitation for ${invitation.email}`}
              disabled={pending}
            >
              Cancel
            </Button>
          </fetcher.Form>
        </ItemActions>
      )}
    </Item>
  );
}
