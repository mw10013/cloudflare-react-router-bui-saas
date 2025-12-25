import type { Route } from "./+types/admin.users";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import * as Oui from "@/components/ui/oui-index";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { onSubmitReactRouter } from "@/lib/oui-on-submit-react-router";
import { RequestContext } from "@/lib/request-context";
import { invariant } from "@epic-web/invariant";
import { Search } from "lucide-react";
import * as Rac from "react-aria-components";
import * as ReactRouter from "react-router";
import * as z from "zod";

interface AlertFormActionResult {
  success: boolean;
  message?: string;
  details?: string | string[];
  validationErrors?: Rac.FormProps["validationErrors"];
}

/**
 * A shadcn Alert for a form displaying form action result.
 * @param props - Component props including success, message, details.
 */
function AlertForm({
  success,
  message,
  details,
  className,
  ...props
}: React.ComponentProps<typeof Alert> &
  Partial<Pick<AlertFormActionResult, "success" | "message" | "details">>) {
  const detailsArray = Array.isArray(details)
    ? details
    : details
      ? [details]
      : [];
  if (success === undefined) return null;
  if (!message && detailsArray.length === 0) return null;

  return (
    <Alert
      data-slot="alert-form"
      variant={success ? "default" : "destructive"}
      className={className}
      {...props}
    >
      {message && <AlertTitle>{message}</AlertTitle>}
      {detailsArray.length > 0 && (
        <AlertDescription>
          {detailsArray.map((detail, i) => (
            <div key={i}>{detail}</div>
          ))}
        </AlertDescription>
      )}
    </Alert>
  );
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const LIMIT = 10;
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    filter: z.string().trim().optional(),
  });
  const { page, filter } = schema.parse(params);
  const offset = (page - 1) * LIMIT;
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { authService: auth } = requestContext;
  const result = await auth.api.listUsers({
    query: {
      limit: LIMIT,
      offset,
      searchField: "email",
      searchValue: filter === "" ? undefined : filter,
      searchOperator: "contains",
      sortBy: "email",
      sortDirection: "asc",
    },
    headers: request.headers,
  });
  invariant("limit" in result, "Expected 'limit' to be in result");
  const pageCount = Math.max(1, Math.ceil(result.total / LIMIT));
  if (page > pageCount) {
    const u = new URL(request.url);
    u.searchParams.set("page", String(pageCount));
    return ReactRouter.redirect(u.toString());
  }

  return {
    users: result.users,
    page,
    pageCount,
    filter,
  };
}

export async function action({
  request,
  context,
}: Route.ActionArgs): Promise<AlertFormActionResult> {
  const schema = z.discriminatedUnion("intent", [
    z.object({
      intent: z.literal("ban"),
      userId: z.string(),
      banReason: z.string().max(4),
    }),
    z.object({ intent: z.literal("unban"), userId: z.string() }),
    z.object({ intent: z.literal("impersonate"), userId: z.string() }),
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
  const { authService: auth } = requestContext;
  switch (parseResult.data.intent) {
    case "ban":
      await auth.api.banUser({
        headers: request.headers,
        body: {
          userId: parseResult.data.userId,
          banReason: parseResult.data.banReason,
        },
      });
      return { success: true };
    case "unban":
      await auth.api.unbanUser({
        headers: request.headers,
        body: { userId: parseResult.data.userId },
      });
      return { success: true };
    case "impersonate": {
      const { headers } = await auth.api.impersonateUser({
        returnHeaders: true,
        headers: request.headers,
        body: { userId: parseResult.data.userId },
      });
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw ReactRouter.redirect(ReactRouter.href("/app"), { headers });
    }
    default:
      void (parseResult.data satisfies never);
      throw new Error("Unexpected intent");
  }
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  const navigate = ReactRouter.useNavigate();
  const [banDialog, setBanDialog] = React.useState<{
    isOpen: boolean;
    userId?: string;
  }>({ isOpen: false });
  const onOpenChangeBanDialog = React.useCallback(
    (isOpen: boolean) => {
      setBanDialog((prev) =>
        prev.isOpen === isOpen
          ? prev
          : isOpen
            ? { ...prev, isOpen }
            : { isOpen: false, userId: undefined },
      );
    },
    [setBanDialog],
  );
  const fetcher = ReactRouter.useFetcher(); // Caution: shared fetcher for simplicity.

  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          Manage your users and roles.
        </p>
      </header>

      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const filter = formData.get("filter");
            if (typeof filter === "string")
              void navigate(`./?filter=${encodeURIComponent(filter)}&page=1`);
          }}
        >
          <InputGroup>
            <InputGroupInput
              name="filter"
              defaultValue={loaderData.filter ?? ""}
              placeholder="Filter by email..."
              aria-label="Filter by email"
            />
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
          </InputGroup>
        </form>
      </div>

      <Oui.Table aria-label="Users">
        <Oui.TableHeader>
          <Oui.Column isRowHeader className="w-8">
            Id
          </Oui.Column>
          <Oui.Column>Email</Oui.Column>
          <Oui.Column>Role</Oui.Column>
          <Oui.Column>Verified</Oui.Column>
          <Oui.Column>Banned</Oui.Column>
          <Oui.Column>Ban Reason</Oui.Column>
          <Oui.Column>Created</Oui.Column>
          <Oui.Column className="w-10 text-right" aria-label="Actions">
            <span className="sr-only">Actions</span>
          </Oui.Column>
        </Oui.TableHeader>
        <Oui.TableBody items={loaderData.users}>
          {(user) => (
            <Oui.Row id={user.id}>
              <Oui.Cell>{user.id}</Oui.Cell>
              <Oui.Cell>{user.email}</Oui.Cell>
              <Oui.Cell>{user.role}</Oui.Cell>
              <Oui.Cell>{String(user.emailVerified)}</Oui.Cell>
              <Oui.Cell>{String(user.banned)}</Oui.Cell>
              <Oui.Cell>{user.banReason ?? ""}</Oui.Cell>
              <Oui.Cell>{user.createdAt.toLocaleString()}</Oui.Cell>
              <Oui.Cell className="text-right">
                <Rac.MenuTrigger>
                  <Oui.Button
                    variant="ghost"
                    className="size-8 p-0"
                    aria-label={`Open menu for ${user.email}`}
                  >
                    ⋮
                  </Oui.Button>
                  <Oui.Popover>
                    <Oui.Menu>
                      {user.banned ? (
                        <Oui.MenuItem
                          key="unban"
                          id="unban"
                          onAction={() => {
                            void fetcher.submit(
                              {
                                intent: "unban",
                                userId: user.id,
                              },
                              { method: "post" },
                            );
                          }}
                        >
                          Unban
                        </Oui.MenuItem>
                      ) : (
                        <Oui.MenuItem
                          key="ban"
                          id="ban"
                          onAction={() => {
                            setBanDialog({ isOpen: true, userId: user.id });
                          }}
                        >
                          Ban
                        </Oui.MenuItem>
                      )}
                      <Oui.MenuItem
                        key="impersonate"
                        id="impersonate"
                        onAction={() => {
                          void fetcher.submit(
                            {
                              intent: "impersonate",
                              userId: user.id,
                            },
                            { method: "post" },
                          );
                        }}
                      >
                        Impersonate
                      </Oui.MenuItem>
                    </Oui.Menu>
                  </Oui.Popover>
                </Rac.MenuTrigger>
              </Oui.Cell>
            </Oui.Row>
          )}
        </Oui.TableBody>
      </Oui.Table>

      {loaderData.pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/admin/users?page=${String(
                  loaderData.page > 1 ? loaderData.page - 1 : 1,
                )}${
                  loaderData.filter
                    ? `&filter=${encodeURIComponent(loaderData.filter)}`
                    : ""
                }`}
              />
            </PaginationItem>
            {Array.from({ length: loaderData.pageCount }, (_, i) => {
              const page = i + 1;
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href={`/admin/users?page=${String(page)}${
                      loaderData.filter
                        ? `&filter=${encodeURIComponent(loaderData.filter)}`
                        : ""
                    }`}
                    isActive={page === loaderData.page}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href={`/admin/users?page=${String(
                  loaderData.page < loaderData.pageCount
                    ? loaderData.page + 1
                    : loaderData.pageCount,
                )}${
                  loaderData.filter
                    ? `&filter=${encodeURIComponent(loaderData.filter)}`
                    : ""
                }`}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <BanDialog
        key={banDialog.userId}
        userId={banDialog.userId}
        isOpen={banDialog.isOpen}
        onOpenChange={onOpenChangeBanDialog}
      />
    </div>
  );
}

/**
 * Dialog used to ban a user.
 *
 * The parent should pass `key={userId}` when rendering this component so
 * React will remount the dialog whenever the `userId` changes, preventing
 * stale hook state tied to a previous user.
 *
 * `onOpenChange` must be stable (e.g. wrapped with `useCallback`) to avoid runaway effect re-runs.
 * When `onOpenChange(false)` is invoked the parent should also clear
 * `userId` (set it to `undefined`) so the dialog unmounts cleanly and
 * doesn't retain a stale selection tied to a previous user.
 */
function BanDialog({
  userId,
  isOpen,
  onOpenChange,
}: {
  userId?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const fetcher = ReactRouter.useFetcher<Route.ComponentProps["actionData"]>();
  React.useEffect(() => {
    if (fetcher.data?.success) {
      onOpenChange(false);
    }
  }, [fetcher.data?.success, onOpenChange]);

  if (!userId) return null; // After hooks per Rules of Hooks.
  return (
    <Dialog key={userId} open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban User</DialogTitle>
          <DialogDescription>
            Provide a reason for banning this user.
          </DialogDescription>
        </DialogHeader>
        <form method="post" onSubmit={onSubmitReactRouter(fetcher.submit)}>
          <AlertForm
            success={fetcher.data?.success}
            message={fetcher.data?.message}
            details={fetcher.data?.details}
          />
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="banReason" className="text-right">
                Reason
              </Label>
              <Input
                id="banReason"
                name="banReason"
                defaultValue=""
                autoFocus
                className="col-span-3"
              />
            </div>
          </div>
          <input type="hidden" name="userId" value={userId} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              name="intent"
              value="ban"
              disabled={fetcher.state !== "idle"}
            >
              Ban
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
