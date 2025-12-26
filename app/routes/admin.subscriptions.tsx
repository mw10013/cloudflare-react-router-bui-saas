import type { Route } from "./+types/admin.subscriptions";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequestContext } from "@/lib/request-context";
import { invariant } from "@epic-web/invariant";
import { Search } from "lucide-react";
import * as ReactRouter from "react-router";
import * as z from "zod";

export async function loader({ request, context }: Route.LoaderArgs) {
  const LIMIT = 20;
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
  const { repository } = requestContext;
  const result = await repository.getSubscriptions({
    limit: LIMIT,
    offset,
    searchValue: filter === "" ? undefined : filter,
  });
  const pageCount = Math.max(1, Math.ceil(result.count / LIMIT));
  if (page > pageCount) {
    const u = new URL(request.url);
    u.searchParams.set("page", String(pageCount));
    return ReactRouter.redirect(u.toString());
  }

  return {
    subscriptions: result.subscriptions,
    page,
    pageCount,
    filter,
  };
}

export default function RouteComponent({ loaderData }: Route.ComponentProps) {
  const navigate = ReactRouter.useNavigate();

  return (
    <div className="flex flex-col gap-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground text-sm">
          Manage your subscriptions.
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">Id</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Stripe Subscription ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loaderData.subscriptions.map((subscription) => (
            <TableRow key={subscription.subscriptionId}>
              <TableCell>{subscription.subscriptionId}</TableCell>
              <TableCell>{subscription.user.email}</TableCell>
              <TableCell>{subscription.plan}</TableCell>
              <TableCell>{subscription.status}</TableCell>
              <TableCell>
                {subscription.stripeSubscriptionId ? (
                  <a
                    href={`https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {subscription.stripeSubscriptionId}
                  </a>
                ) : (
                  ""
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {loaderData.pageCount > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={`/admin/subscriptions?page=${String(
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
                    href={`/admin/subscriptions?page=${String(page)}${
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
                href={`/admin/subscriptions?page=${String(
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
    </div>
  );
}
