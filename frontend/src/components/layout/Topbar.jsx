import {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  ArchiveRestore,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Command,
  Expand,
  FileCheck2,
  FilePlus2,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Minimize2,
  Receipt,
  School,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserCircle2,
  Users,
  Wallet,
  WalletCards,
  X
} from "lucide-react";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Navigation Search Items
|--------------------------------------------------------------------------
*/

const navigationItems = [
  {
    label: "Dashboard",
    description:
      "Dashboard overview and statistics",
    path: "/dashboard",
    icon: LayoutDashboard,
    roles: [
      "super_admin",
      "principal",
      "teacher",
      "accountant"
    ]
  },

  {
    label: "Schools",
    description:
      "Manage registered schools",
    path: "/schools",
    icon: School,
    roles: [
      "super_admin"
    ]
  },

  {
    label: "Users",
    description:
      "Manage system users and accounts",
    path: "/users",
    icon: Users,
    roles: [
      "super_admin",
      "principal"
    ]
  },

  {
    label: "Classes",
    description:
      "Manage school classes",
    path: "/classes",
    icon: GraduationCap,
    roles: [
      "super_admin",
      "principal",
      "teacher"
    ]
  },

  {
    label: "Subjects",
    description:
      "Manage school subjects",
    path: "/subjects",
    icon: BookOpen,
    roles: [
      "super_admin",
      "principal",
      "teacher"
    ]
  },

  {
    label: "Teachers",
    description:
      "Manage teaching faculty records",
    path: "/teachers",
    icon: Users,
    roles: [
      "super_admin",
      "principal"
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Staff Management
  |--------------------------------------------------------------------------
  */

  {
    label: "Staff Records",
    description:
      "Manage non-teaching staff records",
    path: "/staff",
    icon: BriefcaseBusiness,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Staff Daily Attendance",
    description:
      "Mark daily non-teaching staff attendance",
    path: "/staff-attendance",
    icon: CalendarCheck,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Staff Attendance History",
    description:
      "View and update staff attendance records",
    path: "/staff-attendance/history",
    icon: History,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Staff Attendance Report",
    description:
      "View monthly staff attendance reports",
    path: "/staff-attendance/report",
    icon: BarChart3,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Deleted Staff Attendance",
    description:
      "View and restore deleted attendance records",
    path: "/staff-attendance/deleted",
    icon: ArchiveRestore,
    roles: [
      "super_admin",
      "principal"
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Staff Leave Management
  |--------------------------------------------------------------------------
  */

  {
    label: "Staff Leave Requests",
    description:
      "Create, review and process staff leave requests",
    path: "/staff-leaves",
    icon: FileCheck2,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "New Staff Leave Request",
    description:
      "Create a new leave request for a staff member",
    path: "/staff-leaves/new",
    icon: FilePlus2,
    roles: [
      "super_admin",
      "principal"
    ]
  },

  {
    label: "Staff Leave Report",
    description:
      "View monthly and yearly staff leave reports",
    path: "/staff-leaves/report",
    icon: BarChart3,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Deleted Staff Leaves",
    description:
      "View and restore deleted staff leave requests",
    path: "/staff-leaves/deleted",
    icon: ArchiveRestore,
    roles: [
      "super_admin",
      "principal"
    ]
  },

  {
    label: "Students",
    description:
      "Manage student records",
    path: "/students",
    icon: GraduationCap,
    roles: [
      "super_admin",
      "principal",
      "teacher",
      "accountant"
    ]
  },

  {
    label: "Student Attendance",
    description:
      "Manage student attendance",
    path: "/attendance",
    icon: CalendarCheck,
    roles: [
      "super_admin",
      "principal",
      "teacher"
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Staff Payroll
  |--------------------------------------------------------------------------
  */

  {
    label: "Staff Payroll",
    description:
      "Generate and process monthly staff payroll",
    path: "/payroll",
    icon: CircleDollarSign,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Salary Structures",
    description:
      "Manage staff salary structures and payroll rules",
    path:
      "/payroll/salary-structures",
    icon: Settings2,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label:
      "Deleted Salary Structures",
    description:
      "View and restore deleted staff salary structures",
    path:
      "/payroll/salary-structures/deleted",
    icon: ArchiveRestore,
    roles: [
      "super_admin",
      "principal"
    ]
  },

  {
    label: "Deleted Payroll",
    description:
      "View and restore deleted monthly payroll records",
    path: "/payroll/deleted",
    icon: Trash2,
    roles: [
      "super_admin",
      "principal"
    ]
  },

  {
    label: "Fee Structures",
    description:
      "Manage class fee structures",
    path: "/fee-structures",
    icon: Wallet,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Fee Collections",
    description:
      "Manage invoices and fee payments",
    path: "/fee-collections",
    icon: Receipt,
    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    label: "Audit Logs",
    description:
      "View system activity logs",
    path: "/audit-logs",
    icon: ShieldCheck,
    roles: [
      "super_admin",
      "principal"
    ]
  }
];

/*
|--------------------------------------------------------------------------
| Page Information
|--------------------------------------------------------------------------
*/

const getPageInformation = (
  pathname
) => {
  /*
  |--------------------------------------------------------------------------
  | School Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname.startsWith(
      "/schools/"
    )
  ) {
    return {
      title: "School Details",
      parent: "Schools"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | User Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname.startsWith(
      "/users/"
    )
  ) {
    return {
      title: "User Details",
      parent: "Users"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Teacher Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname ===
    "/teachers/deleted"
  ) {
    return {
      title: "Deleted Teachers",
      parent: "Teachers"
    };
  }

  if (
    pathname.startsWith(
      "/teachers/"
    )
  ) {
    return {
      title: "Teacher Details",
      parent: "Teachers"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Staff Attendance Routes
  |--------------------------------------------------------------------------
  |
  | تمام exact Staff Attendance routes کو Staff detail route سے پہلے
  | check کیا جا رہا ہے۔
  |
  */

  if (
    pathname ===
    "/staff-attendance/deleted"
  ) {
    return {
      title:
        "Deleted Staff Attendance",
      parent:
        "Staff Attendance"
    };
  }

  if (
    pathname ===
    "/staff-attendance/history"
  ) {
    return {
      title:
        "Staff Attendance History",
      parent:
        "Staff Attendance"
    };
  }

  if (
    pathname ===
    "/staff-attendance/report"
  ) {
    return {
      title:
        "Monthly Attendance Report",
      parent:
        "Staff Attendance"
    };
  }

  if (
    pathname ===
    "/staff-attendance"
  ) {
    return {
      title:
        "Daily Staff Attendance",
      parent: "Staff"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Staff Leave Routes
  |--------------------------------------------------------------------------
  |
  | Static routes کو dynamic leave ID routes سے پہلے check کیا جا رہا ہے۔
  |
  */

  if (
    pathname ===
    "/staff-leaves/new"
  ) {
    return {
      title:
        "Create Staff Leave",
      parent:
        "Staff Leaves"
    };
  }

  if (
    pathname ===
    "/staff-leaves/report"
  ) {
    return {
      title:
        "Staff Leave Report",
      parent:
        "Staff Leaves"
    };
  }

  if (
    pathname ===
    "/staff-leaves/deleted"
  ) {
    return {
      title:
        "Deleted Staff Leaves",
      parent:
        "Staff Leaves"
    };
  }

  if (
    /^\/staff-leaves\/[^/]+\/edit$/.test(
      pathname
    )
  ) {
    return {
      title:
        "Edit Staff Leave",
      parent:
        "Staff Leaves"
    };
  }

  if (
    /^\/staff-leaves\/[^/]+$/.test(
      pathname
    )
  ) {
    return {
      title:
        "Staff Leave Details",
      parent:
        "Staff Leaves"
    };
  }

  if (
    pathname ===
    "/staff-leaves"
  ) {
    return {
      title:
        "Staff Leave Management",
      parent:
        "Staff"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Staff Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname === "/staff"
  ) {
    return {
      title:
        "Staff Management",
      parent: "Dashboard"
    };
  }

  if (
    pathname ===
    "/staff/deleted"
  ) {
    return {
      title: "Deleted Staff",
      parent: "Staff"
    };
  }

  if (
    pathname.startsWith(
      "/staff/"
    )
  ) {
    return {
      title: "Staff Details",
      parent: "Staff"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Student Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname ===
    "/students/deleted"
  ) {
    return {
      title:
        "Deleted Students",
      parent: "Students"
    };
  }

  if (
    pathname.startsWith(
      "/students/"
    )
  ) {
    return {
      title:
        "Student Details",
      parent: "Students"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Staff Payroll Routes
  |--------------------------------------------------------------------------
  |
  | Salary Structure routes کو general payroll detail routes سے پہلے
  | check کیا جا رہا ہے تاکہ dynamic IDs غلط title نہ بنائیں۔
  |
  */

  if (
    pathname ===
    "/payroll/salary-structures/deleted"
  ) {
    return {
      title:
        "Deleted Salary Structures",
      parent:
        "Salary Structures"
    };
  }

  if (
    pathname ===
    "/payroll/salary-structures/new"
  ) {
    return {
      title:
        "Create Salary Structure",
      parent:
        "Salary Structures"
    };
  }

  if (
    /^\/payroll\/salary-structures\/[^/]+\/edit$/.test(
      pathname
    )
  ) {
    return {
      title:
        "Edit Salary Structure",
      parent:
        "Salary Structures"
    };
  }

  if (
    /^\/payroll\/salary-structures\/[^/]+$/.test(
      pathname
    )
  ) {
    return {
      title:
        "Salary Structure Details",
      parent:
        "Salary Structures"
    };
  }

  if (
    pathname ===
    "/payroll/deleted"
  ) {
    return {
      title:
        "Deleted Payroll",
      parent:
        "Staff Payroll"
    };
  }

  if (
    /^\/payroll\/[^/]+\/payslip$/.test(
      pathname
    )
  ) {
    return {
      title: "Staff Payslip",
      parent: "Staff Payroll"
    };
  }

  if (
    /^\/payroll\/[^/]+$/.test(
      pathname
    )
  ) {
    return {
      title: "Payroll Details",
      parent: "Staff Payroll"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Fee Structure Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname ===
    "/fee-structures/deleted"
  ) {
    return {
      title:
        "Deleted Fee Structures",
      parent:
        "Fee Structures"
    };
  }

  if (
    pathname.startsWith(
      "/fee-structures/"
    )
  ) {
    return {
      title:
        "Fee Structure Details",
      parent:
        "Fee Structures"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Fee Collection Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname ===
    "/fee-collections/deleted"
  ) {
    return {
      title:
        "Deleted Fee Collections",
      parent:
        "Fee Collections"
    };
  }

  if (
    pathname.startsWith(
      "/fee-collections/"
    )
  ) {
    return {
      title:
        "Fee Collection Details",
      parent:
        "Fee Collections"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Audit Log Routes
  |--------------------------------------------------------------------------
  */

  if (
    pathname ===
    "/audit-logs/deleted"
  ) {
    return {
      title:
        "Deleted Audit Logs",
      parent:
        "Audit Logs"
    };
  }

  if (
    pathname.startsWith(
      "/audit-logs/"
    )
  ) {
    return {
      title:
        "Audit Log Details",
      parent:
        "Audit Logs"
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Exact Navigation Routes
  |--------------------------------------------------------------------------
  */

  const currentItem =
    navigationItems.find(
      (item) =>
        pathname === item.path
    );

  return {
    title:
      currentItem?.label ||
      "Dashboard",

    parent:
      currentItem?.path ===
      "/dashboard"
        ? ""
        : "Dashboard"
  };
};

/*
|--------------------------------------------------------------------------
| Formatting Helpers
|--------------------------------------------------------------------------
*/

const formatRole = (
  role
) => {
  if (!role) {
    return "User";
  }

  return String(role)
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

const formatCurrentDate =
  () => {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    ).format(
      new Date()
    );
  };

/*
|--------------------------------------------------------------------------
| Topbar Component
|--------------------------------------------------------------------------
*/

export const Topbar = ({
  onMenuClick
}) => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    user,
    logout
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | Refs
  |--------------------------------------------------------------------------
  */

  const desktopSearchRef =
    useRef(null);

  const mobileSearchRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | State
  |--------------------------------------------------------------------------
  */

  const [
    profileOpen,
    setProfileOpen
  ] = useState(false);

  const [
    notificationsOpen,
    setNotificationsOpen
  ] = useState(false);

  const [
    mobileSearchOpen,
    setMobileSearchOpen
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery
  ] = useState("");

  const [
    loggingOut,
    setLoggingOut
  ] = useState(false);

  const [
    isFullscreen,
    setIsFullscreen
  ] = useState(() => {
    if (
      typeof document ===
      "undefined"
    ) {
      return false;
    }

    return Boolean(
      document.fullscreenElement
    );
  });

  /*
  |--------------------------------------------------------------------------
  | User Information
  |--------------------------------------------------------------------------
  */

  const userRole =
    String(
      user?.role || ""
    ).toLowerCase();

  const initials =
    (user?.name || "Admin")
      .split(" ")
      .filter(Boolean)
      .map(
        (part) => part[0]
      )
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const schoolName =
    user?.schoolId
      ?.schoolName ||
    user?.school
      ?.schoolName ||
    (
      userRole ===
      "super_admin"
        ? "All Schools"
        : "Assigned School"
    );

  /*
  |--------------------------------------------------------------------------
  | Current Page Information
  |--------------------------------------------------------------------------
  */

  const pageInformation =
    useMemo(
      () =>
        getPageInformation(
          location.pathname
        ),
      [
        location.pathname
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Available Navigation by Role
  |--------------------------------------------------------------------------
  */

  const availableNavigation =
    useMemo(() => {
      return navigationItems.filter(
        (item) =>
          item.roles.includes(
            userRole
          )
      );
    }, [
      userRole
    ]);

  /*
  |--------------------------------------------------------------------------
  | Search Results
  |--------------------------------------------------------------------------
  */

  const searchResults =
    useMemo(() => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLowerCase();

      if (!normalizedSearch) {
        return [];
      }

      return availableNavigation
        .filter((item) => {
          const label =
            item.label
              .toLowerCase();

          const description =
            item.description
              .toLowerCase();

          return (
            label.includes(
              normalizedSearch
            ) ||
            description.includes(
              normalizedSearch
            )
          );
        })
        .slice(0, 8);
    }, [
      availableNavigation,
      searchQuery
    ]);

  /*
  |--------------------------------------------------------------------------
  | Close Panels
  |--------------------------------------------------------------------------
  */

  const closePanels = () => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileSearchOpen(false);
  };

  /*
  |--------------------------------------------------------------------------
  | Close Panels on Route Change
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setProfileOpen(false);
    setNotificationsOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery("");
  }, [
    location.pathname
  ]);

  /*
  |--------------------------------------------------------------------------
  | Keyboard Shortcuts
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setMobileSearchOpen(false);
        setSearchQuery("");

        return;
      }

      const activeElement =
        document.activeElement;

      const isTyping =
        activeElement?.tagName ===
          "INPUT" ||
        activeElement?.tagName ===
          "TEXTAREA" ||
        activeElement
          ?.isContentEditable;

      if (
        event.key === "/" &&
        !isTyping
      ) {
        event.preventDefault();

        if (
          window.innerWidth >=
          768
        ) {
          desktopSearchRef
            .current
            ?.focus();
        } else {
          setMobileSearchOpen(
            true
          );

          window.setTimeout(
            () => {
              mobileSearchRef
                .current
                ?.focus();
            },
            50
          );
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Fullscreen Listener
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        setIsFullscreen(
          Boolean(
            document
              .fullscreenElement
          )
        );
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Search Navigation
  |--------------------------------------------------------------------------
  */

  const handleSearchNavigation = (
    path
  ) => {
    setSearchQuery("");
    setMobileSearchOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);

    navigate(path);
  };

  const handleSearchKeyDown = (
    event
  ) => {
    if (
      event.key ===
        "Enter" &&
      searchResults.length >
        0
    ) {
      event.preventDefault();

      handleSearchNavigation(
        searchResults[0].path
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fullscreen
  |--------------------------------------------------------------------------
  */

  const handleFullscreen =
    async () => {
      try {
        if (
          document
            .fullscreenElement
        ) {
          await document
            .exitFullscreen();
        } else if (
          document
            .documentElement
            .requestFullscreen
        ) {
          await document
            .documentElement
            .requestFullscreen();
        }
      } catch (
        fullscreenError
      ) {
        console.error(
          "Fullscreen error:",
          fullscreenError
        );

        setIsFullscreen(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Logout
  |--------------------------------------------------------------------------
  */

  const handleLogout =
    async () => {
      if (loggingOut) {
        return;
      }

      setLoggingOut(true);

      try {
        await logout();

        navigate(
          "/login",
          {
            replace: true
          }
        );
      } catch (
        logoutError
      ) {
        console.error(
          "Logout error:",
          logoutError
        );
      } finally {
        setLoggingOut(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Toggle Panels
  |--------------------------------------------------------------------------
  */

  const toggleProfile = () => {
    setProfileOpen(
      (current) =>
        !current
    );

    setNotificationsOpen(false);
    setMobileSearchOpen(false);
    setSearchQuery("");
  };

  const toggleNotifications =
    () => {
      setNotificationsOpen(
        (current) =>
          !current
      );

      setProfileOpen(false);
      setMobileSearchOpen(false);
      setSearchQuery("");
    };

  /*
  |--------------------------------------------------------------------------
  | Search Results UI
  |--------------------------------------------------------------------------
  */

  const renderSearchResults =
    () => {
      if (
        !searchQuery.trim()
      ) {
        return (
          <div className="px-4 py-5 text-center">
            <Search
              size={24}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-sm font-semibold text-slate-600">
              Search the system
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Find dashboard modules
              and pages quickly.
            </p>
          </div>
        );
      }

      if (
        searchResults.length ===
        0
      ) {
        return (
          <div className="px-4 py-5 text-center">
            <Search
              size={24}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-sm font-semibold text-slate-600">
              No page found
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Try a different search
              term.
            </p>
          </div>
        );
      }

      return (
        <div className="p-2">
          {searchResults.map(
            (item) => {
              const ItemIcon =
                item.icon ||
                Search;

              return (
                <button
                  key={item.path}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                  onClick={() =>
                    handleSearchNavigation(
                      item.path
                    )
                  }
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                    <ItemIcon
                      size={16}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700">
                      {item.label}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {
                        item.description
                      }
                    </p>
                  </div>
                </button>
              );
            }
          )}
        </div>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <header className="relative z-30 flex h-[68px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:px-6">
      {/*
      |--------------------------------------------------------------------------
      | Left Section
      |--------------------------------------------------------------------------
      */}

      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-slate-800 sm:text-base">
            {
              pageInformation.title
            }
          </h1>

          <div className="mt-0.5 hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
            <LayoutDashboard
              size={11}
            />

            {pageInformation.parent && (
              <>
                <span>
                  {
                    pageInformation.parent
                  }
                </span>

                <span>/</span>
              </>
            )}

            <span className="truncate text-slate-500">
              {
                pageInformation.title
              }
            </span>
          </div>
        </div>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Desktop Search
      |--------------------------------------------------------------------------
      */}

      <div className="absolute left-1/2 z-50 hidden w-full max-w-md -translate-x-1/2 md:block">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            ref={
              desktopSearchRef
            }
            type="search"
            value={searchQuery}
            placeholder="Search pages and modules..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-50"
            onChange={(
              event
            ) =>
              setSearchQuery(
                event.target.value
              )
            }
            onKeyDown={
              handleSearchKeyDown
            }
            onFocus={() => {
              setProfileOpen(false);
              setNotificationsOpen(
                false
              );
            }}
          />

          <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
            <Command size={10} />
            /
          </div>

          {searchQuery && (
            <div className="absolute left-0 right-0 top-[46px] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {
                renderSearchResults()
              }
            </div>
          )}
        </div>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Right Section
      |--------------------------------------------------------------------------
      */}

      <div className="relative z-50 flex items-center gap-1.5 sm:gap-2">
        {/*
        |--------------------------------------------------------------------------
        | Mobile Search
        |--------------------------------------------------------------------------
        */}

        <button
          type="button"
          className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 md:hidden"
          onClick={() => {
            setMobileSearchOpen(
              true
            );

            setProfileOpen(false);

            setNotificationsOpen(
              false
            );

            window.setTimeout(
              () => {
                mobileSearchRef
                  .current
                  ?.focus();
              },
              50
            );
          }}
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/*
        |--------------------------------------------------------------------------
        | Current Date
        |--------------------------------------------------------------------------
        */}

        <div className="hidden items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 xl:flex">
          <CalendarDays
            size={15}
            className="text-slate-400"
          />

          <span className="whitespace-nowrap text-xs font-medium text-slate-600">
            {
              formatCurrentDate()
            }
          </span>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Fullscreen
        |--------------------------------------------------------------------------
        */}

        <button
          type="button"
          className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 sm:inline-flex"
          onClick={
            handleFullscreen
          }
          aria-label={
            isFullscreen
              ? "Exit fullscreen"
              : "Enter fullscreen"
          }
          title={
            isFullscreen
              ? "Exit fullscreen"
              : "Enter fullscreen"
          }
        >
          {isFullscreen ? (
            <Minimize2
              size={18}
            />
          ) : (
            <Expand
              size={18}
            />
          )}
        </button>

        {/*
        |--------------------------------------------------------------------------
        | Notifications
        |--------------------------------------------------------------------------
        */}

        <div className="relative">
          <button
            type="button"
            className={`relative rounded-xl p-2.5 transition ${
              notificationsOpen
                ? "bg-brand-50 text-brand-700"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
            onClick={
              toggleNotifications
            }
            aria-label="Notifications"
            aria-expanded={
              notificationsOpen
            }
          >
            <Bell size={18} />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-[48px] z-[60] w-[310px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Notifications
                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">
                    System alerts and
                    updates
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                  0 New
                </span>
              </div>

              <div className="flex min-h-48 flex-col items-center justify-center px-5 py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Bell size={22} />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  No new notifications
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Important system
                  updates will appear
                  here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/*
        |--------------------------------------------------------------------------
        | User Profile
        |--------------------------------------------------------------------------
        */}

        <div className="relative">
          <button
            type="button"
            onClick={
              toggleProfile
            }
            className={`flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 transition ${
              profileOpen
                ? "bg-slate-100"
                : "hover:bg-slate-100"
            }`}
            aria-expanded={
              profileOpen
            }
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white shadow-sm">
                {initials}
              </div>

              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
            </div>

            <div className="hidden max-w-40 text-left lg:block">
              <p className="truncate text-sm font-semibold text-slate-700">
                {user?.name ||
                  "System User"}
              </p>

              <p className="truncate text-[11px] text-slate-400">
                {formatRole(
                  user?.role
                )}
              </p>
            </div>

            <ChevronDown
              size={15}
              className={`hidden text-slate-400 transition-transform sm:block ${
                profileOpen
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[50px] z-[60] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {/*
              |--------------------------------------------------------------------------
              | Profile Header
              |--------------------------------------------------------------------------
              */}

              <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold ring-1 ring-white/20">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {user?.name ||
                        "System User"}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-white/70">
                      {user?.email ||
                        "No email available"}
                    </p>
                  </div>
                </div>
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Account Information
              |--------------------------------------------------------------------------
              */}

              <div className="space-y-3 border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck
                    size={16}
                    className="shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Role
                    </p>

                    <p className="truncate text-xs font-semibold text-slate-700">
                      {formatRole(
                        user?.role
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <School
                    size={16}
                    className="shrink-0 text-slate-400"
                  />

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      School access
                    </p>

                    <p className="truncate text-xs font-semibold text-slate-700">
                      {schoolName}
                    </p>
                  </div>
                </div>
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Profile Actions
              |--------------------------------------------------------------------------
              */}

              <div className="p-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                  onClick={() => {
                    setProfileOpen(
                      false
                    );

                    navigate(
                      "/dashboard"
                    );
                  }}
                >
                  <UserCircle2
                    size={17}
                  />

                  My Dashboard
                </button>

                <button
                  type="button"
                  disabled={
                    loggingOut
                  }
                  className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={
                    handleLogout
                  }
                >
                  <LogOut
                    size={17}
                  />

                  {loggingOut
                    ? "Logging out..."
                    : "Log out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/*
      |--------------------------------------------------------------------------
      | Mobile Search Panel
      |--------------------------------------------------------------------------
      */}

      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/40 p-4 backdrop-blur-sm md:hidden"
          onClick={() => {
            setMobileSearchOpen(
              false
            );

            setSearchQuery("");
          }}
        >
          <div
            className="mx-auto mt-12 max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center gap-2 border-b border-slate-100 p-3">
              <Search
                size={17}
                className="shrink-0 text-slate-400"
              />

              <input
                ref={
                  mobileSearchRef
                }
                type="search"
                value={
                  searchQuery
                }
                placeholder="Search pages and modules..."
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                onChange={(
                  event
                ) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                onKeyDown={
                  handleSearchKeyDown
                }
              />

              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => {
                  setMobileSearchOpen(
                    false
                  );

                  setSearchQuery("");
                }}
                aria-label="Close search"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {
                renderSearchResults()
              }
            </div>
          </div>
        </div>
      )}

      {/*
      |--------------------------------------------------------------------------
      | Dropdown Backdrop
      |--------------------------------------------------------------------------
      */}

      {(profileOpen ||
        notificationsOpen) && (
        <button
          type="button"
          aria-label="Close dropdown"
          className="fixed inset-0 z-40 cursor-default"
          onClick={closePanels}
        />
      )}
    </header>
  );
};

export default Topbar;