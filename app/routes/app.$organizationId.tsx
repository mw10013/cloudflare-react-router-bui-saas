import type { Organization } from "better-auth/plugins";
import type { User } from "better-auth/types";
import type { Route } from "./+types/app.$organizationId";
import { AppLogoIcon } from "@/components/app-logo-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { RequestContext } from "@/lib/request-context";
import { invariant } from "@epic-web/invariant";
import { ChevronsUpDown, LogOut } from "lucide-react";
import * as ReactRouter from "react-router";

const organizationMiddleware: Route.MiddlewareFunction = async ({
  request,
  context,
  params: { organizationId },
}) => {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const organizations = await requestContext.authService.api.listOrganizations({
    headers: request.headers,
  });
  const organization = organizations.find((org) => org.id === organizationId);
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  if (!organization) throw new Response("Forbidden", { status: 403 });
  context.set(RequestContext, {
    ...requestContext,
    organization,
    organizations,
  });
};

export const middleware: Route.MiddlewareFunction[] = [organizationMiddleware];

export function loader({
  context,
  params: { organizationId },
}: Route.ActionArgs) {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { organization, organizations, session } = requestContext;
  invariant(organization, "Missing organization");
  invariant(organization.id === organizationId, "Organization ID mismatch");
  invariant(organizations, "Missing organizations");
  invariant(session, "Missing session");
  return {
    organization,
    organizations,
    user: session.user,
  };
}

/**
 * The `<main>` element uses `h-svh` for a stable height, essential for this app shell layout.
 * `h-dvh` is avoided because it causes jarring content reflows on mobile when browser UI resizes,
 * which is unsuitable for a layout with internal-only scrolling.
 */
export default function RouteComponent({
  loaderData: { organization, organizations, user },
}: Route.ComponentProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        organization={organization}
        organizations={organizations}
        user={user}
      />
      <main className="flex h-svh w-full flex-col overflow-x-hidden">
        <SidebarTrigger />
        <ReactRouter.Outlet />
      </main>
    </SidebarProvider>
  );
}

export function AppSidebar({
  organization,
  organizations,
  user,
}: {
  organization: Organization;
  organizations: Organization[];
  user: User;
}) {
  const items = [
    {
      id: "Organization Home",
      href: `/app/${organization.id}`,
    },
    {
      id: "Members",
      href: `/app/${organization.id}/members`,
    },
    {
      id: "Invitations",
      href: `/app/${organization.id}/invitations`,
      "data-testid": "sidebar-invitations",
    },
    {
      id: "Billing",
      href: `/app/${organization.id}/billing`,
      "data-testid": "sidebar-billing",
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex w-full items-center gap-2 p-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Home"
            render={<ReactRouter.Link to="/" />}
          >
            <AppLogoIcon className="text-primary size-7" />
          </Button>
          <OrganizationSwitcher
            organizations={organizations}
            organization={organization}
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    render={<ReactRouter.Link to={item.href} />}
                    data-testid={item["data-testid"]}
                  >
                    {item.id}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}

export function OrganizationSwitcher({
  organizations,
  organization,
}: {
  organizations: Organization[];
  organization: Organization;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button
            {...props}
            variant="ghost"
            className="h-auto flex-1 items-center justify-between p-0 text-left font-medium data-hovered:bg-transparent"
          >
            <div className="grid leading-tight">
              <span className="truncate font-medium">{organization.name}</span>
            </div>
            <ChevronsUpDown className="text-muted-foreground ml-2 size-4" />
          </Button>
        )}
      />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              render={<ReactRouter.Link to={`/app/${org.id}`} />}
            >
              {org.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function NavUser({
  user,
}: {
  user: {
    email: string;
  };
}) {
  const submit = ReactRouter.useSubmit();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <SidebarMenuButton
            {...props}
            className="h-12 w-full justify-start overflow-hidden rounded-md p-2 text-left text-sm font-normal"
          >
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </SidebarMenuButton>
        )}
      />
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate px-1 py-1.5 text-center text-sm font-medium">
            {user.email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            void submit(
              {},
              { method: "post", action: ReactRouter.href("/signout") },
            )
          }
        >
          <LogOut className="mr-2 size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
