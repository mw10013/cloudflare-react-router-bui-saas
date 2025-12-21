import type { Route } from "./+types/app.$organizationId.billing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RequestContext } from "@/lib/request-context";
import { invariant } from "@epic-web/invariant";
import { redirect } from "react-router";
import * as ReactRouter from "react-router";
import * as z from "zod";

export async function loader({
  request,
  params: { organizationId },
  context,
}: Route.LoaderArgs) {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { authService: auth } = requestContext;
  const subscriptions = await auth.api.listActiveSubscriptions({
    headers: request.headers,
    query: { referenceId: organizationId },
  });
  const activeSubscription = subscriptions.find(
    (v) => v.status === "active" || v.status === "trialing",
  );
  return { activeSubscription };
}

export async function action({
  request,
  context,
  params: { organizationId },
}: Route.ActionArgs) {
  const schema = z.discriminatedUnion("intent", [
    z.object({
      intent: z.literal("manage"),
    }),
    z.object({
      intent: z.literal("cancel"),
      subscriptionId: z.string().min(1, "Missing subscriptionId"),
    }),
    z.object({
      intent: z.literal("restore"),
      subscriptionId: z.string().min(1, "Missing subscriptionId"),
    }),
  ]);
  const parseResult = schema.parse(
    Object.fromEntries(await request.formData()),
  );
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { authService: auth } = requestContext;
  switch (parseResult.intent) {
    case "manage": {
      const result = await auth.api.createBillingPortal({
        headers: request.headers,
        body: {
          referenceId: organizationId,
          returnUrl: `${
            new URL(request.url).origin
          }/app/${organizationId}/billing`,
        },
      });
      return redirect(result.url);
    }
    case "cancel": {
      const result = await auth.api.cancelSubscription({
        headers: request.headers,
        body: {
          referenceId: organizationId,
          subscriptionId: parseResult.subscriptionId,
          returnUrl: `${
            new URL(request.url).origin
          }/app/${organizationId}/billing`,
        },
      });
      return redirect(result.url);
    }
    case "restore": {
      await auth.api.restoreSubscription({
        headers: request.headers,
        body: {
          referenceId: organizationId,
          subscriptionId: parseResult.subscriptionId,
        },
      });
      return null;
    }
    default:
      void (parseResult satisfies never);
      return null;
  }
}

export default function RouteComponent({
  loaderData: { activeSubscription },
}: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground text-sm">
          Manage your organization's subscription and billing information.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage your billing information and subscription settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSubscription ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="font-medium capitalize"
                    data-testid="active-plan"
                  >
                    {activeSubscription.plan} Plan
                  </p>
                  <p
                    className="text-muted-foreground text-sm"
                    data-testid="active-status"
                  >
                    Status:{" "}
                    {activeSubscription.status === "active" &&
                    activeSubscription.cancelAtPeriodEnd
                      ? `Active ${
                          activeSubscription.periodEnd
                            ? `(Cancels ${
                                new Date(activeSubscription.periodEnd)
                                  .toISOString()
                                  .split("T")[0]
                              })`
                            : ""
                        }`
                      : activeSubscription.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ReactRouter.Form method="post">
                    <Button
                      type="submit"
                      name="intent"
                      value="manage"
                      variant="outline"
                    >
                      Manage Billing
                    </Button>
                  </ReactRouter.Form>
                  {activeSubscription.cancelAtPeriodEnd ? (
                    <ReactRouter.Form method="post">
                      <input
                        type="hidden"
                        name="subscriptionId"
                        value={activeSubscription.id}
                      />
                      <Button
                        type="submit"
                        name="intent"
                        value="restore"
                        variant="default"
                      >
                        Restore Subscription
                      </Button>
                    </ReactRouter.Form>
                  ) : (
                    <ReactRouter.Form method="post">
                      <input
                        type="hidden"
                        name="subscriptionId"
                        value={activeSubscription.id}
                      />
                      <Button
                        type="submit"
                        name="intent"
                        value="cancel"
                        variant="destructive"
                      >
                        Cancel Subscription
                      </Button>
                    </ReactRouter.Form>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                No active subscription for this organization.
              </p>
              <Button
                variant="outline"
                render={<ReactRouter.Link to="/pricing" />}
              >
                Pricing
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
