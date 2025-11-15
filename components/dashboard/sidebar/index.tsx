"use client";

import * as React from "react";
import { useState, useEffect } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import AtomIcon from "@/components/icons/atom";
import BracketsIcon from "@/components/icons/brackets";
import ProcessorIcon from "@/components/icons/proccesor";
import CuteRobotIcon from "@/components/icons/cute-robot";
import EmailIcon from "@/components/icons/email";
import GearIcon from "@/components/icons/gear";
import Logo from "@/components/icons/logo";
import DotsVerticalIcon from "@/components/icons/dots-vertical";
import { Bullet } from "@/components/ui/bullet";
import LockIcon from "@/components/icons/lock";
import Image from "next/image";
import { useIsV0 } from "@/lib/v0-context";
import { createClient } from "@/lib/supabase/client";

// Navigation data for the sidebar
const navMain = [
  {
    title: "Tools",
    items: [
      {
        title: "Trading Terminal",
        url: "/bags/trading",
        icon: BracketsIcon,
        isActive: false,
        locked: false,
      },
      {
        title: "Admin Panel",
        url: "/bags/admin",
        icon: CuteRobotIcon,
        isActive: false,
        locked: false,
      },
    ],
  },
];

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

export function DashboardSidebar({
  className,
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const isV0 = useIsV0();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const supabase = createClient();
        
        // Get the authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.error("[v0] Error fetching user:", authError);
          setIsLoading(false);
          return;
        }

        // Fetch user profile from user_profiles table
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("full_name, email, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("[v0] Error fetching profile:", profileError);
          // Fallback to auth user data if profile doesn't exist
          setUserProfile({
            name: user.user_metadata?.full_name || "",
            email: user.email || "",
            avatar: "/placeholder-user.jpg",
          });
        } else {
          setUserProfile({
            name: profile?.full_name || "",
            email: profile?.email || user.email || "",
            avatar: profile?.avatar_url || "/placeholder-user.jpg",
          });
        }
      } catch (error) {
        console.error("[v0] Unexpected error fetching user profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserProfile();
  }, []);

  // Default user data for loading/fallback state
  const user = userProfile || {
    name: "",
    email: "",
    avatar: "/placeholder-user.jpg",
  };

  return (
    <Sidebar {...props} className={cn("py-sides", className)}>
      <SidebarHeader className="rounded-t-lg flex gap-3 flex-row rounded-b-none">
        <div className="flex overflow-clip size-12 shrink-0 items-center justify-center rounded bg-sidebar-primary-foreground/10 transition-colors group-hover:bg-sidebar-primary text-sidebar-primary-foreground">
          <Logo className="size-10 group-hover:scale-[1.7] origin-top-left transition-transform" width={40} height={40} />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="text-2xl font-display">BAGMAN</span>
          <span className="text-xs uppercase">COINS & TRADES</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navMain.map((group, i) => (
          <SidebarGroup
            className={cn(i === 0 && "rounded-t-none")}
            key={group.title}
          >
            <SidebarGroupLabel>
              <Bullet className="mr-2" />
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem
                    key={item.title}
                    className={cn(
                      item.locked && "pointer-events-none opacity-50",
                      isV0 && "pointer-events-none"
                    )}
                    data-disabled={item.locked}
                  >
                    <SidebarMenuButton
                      asChild={!item.locked}
                      isActive={item.isActive}
                      disabled={item.locked}
                      className={cn(
                        "disabled:cursor-not-allowed",
                        item.locked && "pointer-events-none"
                      )}
                    >
                      {item.locked ? (
                        <div className="flex items-center gap-3 w-full">
                          <item.icon className="size-5" />
                          <span>{item.title}</span>
                        </div>
                      ) : (
                        <a href={item.url}>
                          <item.icon className="size-5" />
                          <span>{item.title}</span>
                        </a>
                      )}
                    </SidebarMenuButton>
                    {item.locked && (
                      <SidebarMenuBadge>
                        <LockIcon className="size-5 block" />
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-0">
        <SidebarGroup>
          <SidebarGroupLabel>
            <Bullet className="mr-2" />
            User
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Popover>
                  <PopoverTrigger className="flex gap-0.5 w-full group cursor-pointer">
                    <div className="shrink-0 flex size-14 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-clip">
                      {isLoading ? (
                        <div className="size-full bg-sidebar-accent animate-pulse" />
                      ) : (
                        <Image
                          src={user.avatar}
                          alt={user.name || user.email}
                          width={120}
                          height={120}
                          className="object-cover"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            e.currentTarget.src = "/placeholder-user.jpg";
                          }}
                        />
                      )}
                    </div>
                    <div className="group/item pl-3 pr-1.5 pt-2 pb-1.5 flex-1 flex bg-sidebar-accent hover:bg-sidebar-accent-active/75 items-center rounded group-data-[state=open]:bg-sidebar-accent-active group-data-[state=open]:hover:bg-sidebar-accent-active group-data-[state=open]:text-sidebar-accent-foreground">
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate text-xl font-display">
                          {isLoading ? (
                            <span className="inline-block h-5 w-24 bg-sidebar-accent-active/50 animate-pulse rounded" />
                          ) : (
                            user.name || "User"
                          )}
                        </span>
                        <span className="truncate text-xs uppercase opacity-50 group-hover/item:opacity-100">
                          {isLoading ? (
                            <span className="inline-block h-3 w-32 bg-sidebar-accent-active/50 animate-pulse rounded mt-1" />
                          ) : (
                            user.email
                          )}
                        </span>
                      </div>
                      <DotsVerticalIcon className="ml-auto size-4" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-56 p-0"
                    side="bottom"
                    align="end"
                    sideOffset={4}
                  >
                    <div className="flex flex-col">
                      <button className="flex items-center px-4 py-2 text-sm hover:bg-accent">
                        <Logo className="mr-2 h-4 w-4" width={16} height={16} />
                        Account
                      </button>
                      <button className="flex items-center px-4 py-2 text-sm hover:bg-accent">
                        <GearIcon className="mr-2 h-4 w-4" />
                        Settings
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
