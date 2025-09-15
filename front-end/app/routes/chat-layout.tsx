import { authkitLoader } from "@workos-inc/authkit-react-router";
import { LogOut, MessageSquare, Plus } from "lucide-react";
import { Link, Outlet, data } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "../components/ui/sidebar";
import { getChatSessions } from "../lib/db/chat.server";
import {
  authenticateWithMigration,
  requireSession,
} from "../lib/session/auth.server";
import { commitSession } from "../lib/session/cookie.server";
import type { Route } from "./+types/chat-layout";

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  const response = await authkitLoader(args, async ({ auth }) => auth.user);

  const workosUser = response.data;

  let { session, userId, user, isAuthenticated } =
    await requireSession(request);

  // If WorkOS user exists but doesn't match cookie session, perform migration
  if (
    workosUser.user &&
    (!isAuthenticated || user.workos_id !== workosUser.id)
  ) {
    console.log(
      "WorkOS/cookie session mismatch detected, performing migration"
    );

    const migrationResult = await authenticateWithMigration(
      request,
      workosUser.id,
      workosUser.email
    );

    // Update session and user info with migrated data
    session = migrationResult.session;
    userId = migrationResult.user.id;
    user = migrationResult.user;
  }

  const chatSessions = await getChatSessions(userId);

  return data(
    {
      user,
      chatSessions,
    },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
};

export default function ChatLayout({ loaderData }: Route.ComponentProps) {
  const { user, chatSessions } = loaderData;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/chat/new">
                  <Plus className="size-4" />
                  <span>New Chat</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chatSessions.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton asChild>
                      <Link to={`/chat/${session.id}`}>
                        <MessageSquare className="size-4" />
                        <span className="truncate">
                          {session.title || "Untitled Chat"}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {user.workos_id ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <div className="bg-background aspect-square size-8 rounded-lg flex items-center justify-center border-gray-300 border">
                        <span className="text-shadow-sidebar-primary text-xs font-medium">
                          {user.email?.[0]?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {user.email || "User"}
                        </span>
                        <span className="truncate text-xs">Logged in</span>
                      </div>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                  >
                    <DropdownMenuItem asChild>
                      <Link to="/auth/logout">
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="hover:bg-blue-700 bg-blue-600 hover:text-white text-white"
                  asChild
                >
                  <Link to="/auth/login">
                    <span className="w-full text-center">Sign in</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          )}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
