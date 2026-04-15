import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { LogOut, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function MainLayout() {
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Tổng quan';
    if (path === '/assessment') return 'Đánh giá';
    if (path === '/profile') return 'Hồ sơ';
    if (path.startsWith('/admin')) return 'Quản trị';
    return 'Tổng quan';
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <SidebarProvider>
      {/* FE-6: skip-to-content link for keyboard users (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg"
      >
        Bỏ qua và đi tới nội dung chính
      </a>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Header */}
          <header className="h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <SidebarTrigger>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Mở menu điều hướng">
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SidebarTrigger>
              <h1 className="font-semibold text-lg">{getPageTitle()}</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <NotificationBell />
              {isAdmin && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                  Admin
                </span>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu tài khoản">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-muted-foreground text-sm">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          
          {/* Main Content */}
          <main id="main-content" className="flex-1 p-4 md:p-6 overflow-auto" tabIndex={-1}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
