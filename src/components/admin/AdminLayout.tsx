import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { BarChart3, Palette, ArrowLeft } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/admin', icon: BarChart3 },
  { title: 'Themes', url: '/admin/themes', icon: Palette },
];

export const AdminLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r border-border">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Admin Panel
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === '/admin'}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link
                        to="/"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to App</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold text-foreground">Bookify Admin</h1>
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
