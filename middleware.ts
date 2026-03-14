import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ADMIN_PERMISSION_MAP: Record<string, string> = {
  "/admin/users": "manage_users",
  "/admin/roles": "manage_system",
  "/admin/permissions": "manage_system",
};

async function getSupabaseFromMiddleware(req: NextRequest, res: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });
}

function requiredPermission(pathname: string) {
  if (pathname.startsWith("/admin/users")) return ADMIN_PERMISSION_MAP["/admin/users"];
  if (pathname.startsWith("/admin/roles")) return ADMIN_PERMISSION_MAP["/admin/roles"];
  if (pathname.startsWith("/admin/permissions")) return ADMIN_PERMISSION_MAP["/admin/permissions"];
  if (pathname.startsWith("/admin")) return "manage_system";
  if (pathname.startsWith("/dashboard/users")) return "manage_users";
  if (pathname.startsWith("/dashboard/roles-permissions")) return "manage_system";
  if (pathname.startsWith("/dashboard/plants")) return "manage_plants";
  if (pathname.startsWith("/dashboard/resources")) return "manage_plants";
  if (pathname.startsWith("/dashboard/scheduler")) return "create_schedules";
  if (pathname.startsWith("/dashboard/production")) return "track_production";
  if (pathname.startsWith("/dashboard/inventory")) return "update_machine_production";
  return null;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const protectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!protectedPath) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = await getSupabaseFromMiddleware(req, res);
  if (!supabase) return res;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const { data: appUser } = await supabase
    .from("app_users")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!appUser || appUser.is_active === false) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "inactive");
    return NextResponse.redirect(url);
  }

  const needed = requiredPermission(pathname);
  if (!needed) return res;

  if (appUser.role === "admin") return res;

  const { data: mappedRole } = await supabase
    .from("user_roles")
    .select("roles(id,name)")
    .eq("user_id", user.id)
    .maybeSingle();

  const rolesField = (mappedRole as {
    roles?: { id?: string; name?: string } | { id?: string; name?: string }[] | null;
  } | null)?.roles;
  const roleObj = Array.isArray(rolesField) ? rolesField[0] ?? null : rolesField ?? null;
  const roleId = roleObj?.id;
  const roleName = roleObj?.name ?? appUser.role;

  if (roleName === "admin") return res;
  if (!roleId) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("error", "forbidden");
    return NextResponse.redirect(url);
  }

  const { data: permissionRow } = await supabase
    .from("role_permissions")
    .select("id, permissions!inner(name)")
    .eq("role_id", roleId)
    .eq("permissions.name", needed)
    .maybeSingle();

  if (!permissionRow) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.set("error", "forbidden");
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
