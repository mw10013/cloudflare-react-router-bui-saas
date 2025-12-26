import type { Route } from "./+types/admin.sessions";
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
  const { repository } = requestContext;
  const result = await repository.getSessions({
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
    sessions: result.sessions,
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
        <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        <p className="text-muted-foreground text-sm">Manage your sessions.</p>
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
            <TableHead>IP Address</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Expires At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loaderData.sessions.map((session) => (
            <TableRow key={session.sessionId}>
              <TableCell>{session.sessionId}</TableCell>
              <TableCell>{session.user.email}</TableCell>
              <TableCell>{session.ipAddress ?? ""}</TableCell>
              <TableCell>
                {new Date(session.createdAt).toLocaleString()}
              </TableCell>
              <TableCell>
                {new Date(session.expiresAt).toLocaleString()}
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
                href={`/admin/sessions?page=${String(
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
                    href={`/admin/sessions?page=${String(page)}${
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
                href={`/admin/sessions?page=${String(
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
