import type { Route } from "./+types/admin";
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

export const adminMiddleware: Route.MiddlewareFunction = ({ context }) => {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { session } = requestContext;
  // eslint-disable-next-line @typescript-eslint/only-throw-error
  if (!session?.user) throw ReactRouter.redirect(ReactRouter.href("/login"));
  if (session.user.role !== "admin")
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw new Response("Forbidden", { status: 403 });
};

export const middleware: Route.MiddlewareFunction[] = [adminMiddleware];

export function loader({ context }: Route.LoaderArgs) {
  const requestContext = context.get(RequestContext);
  invariant(requestContext, "Missing request context.");
  const { session } = requestContext;
  invariant(session?.user, "Missing user session");
  return { user: session.user };
}

export default function RouteComponent({
  loaderData: { user },
}: Route.ComponentProps) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <main className="flex h-svh w-full flex-col overflow-x-hidden">
        <SidebarTrigger />
        <ReactRouter.Outlet />
      </main>
    </SidebarProvider>
  );
}

export function AppSidebar({ user }: { user: { email: string } }) {
  const items = [
    {
      id: "Dashboard",
      href: ReactRouter.href("/admin"),
    },
    {
      id: "Users",
      href: ReactRouter.href("/admin/users"),
    },
    {
      id: "Customers",
      href: ReactRouter.href("/admin/customers"),
    },
    {
      id: "Subscriptions",
      href: ReactRouter.href("/admin/subscriptions"),
    },
    {
      id: "Sessions",
      href: ReactRouter.href("/admin/sessions"),
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Home"
          render={<ReactRouter.Link to="/" />}
        >
          <AppLogoIcon className="text-primary size-7" />
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    render={<ReactRouter.Link to={item.href} />}
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
