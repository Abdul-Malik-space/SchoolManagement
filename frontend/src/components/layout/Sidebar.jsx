import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  NavLink,
  useLocation
} from "react-router-dom";

import {
  ArchiveRestore,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CircleDollarSign,
  GraduationCap,
  FileText,
  History,
  LayoutGrid,
  MessageSquareText,
  Plus,
  Receipt,
  School,
  Settings2,
  ShieldCheck,
  Trash2,
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
| Role-Based Navigation Items
|--------------------------------------------------------------------------
*/

const navItems = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutGrid,

    roles: [
      "super_admin",
      "principal",
      "teacher",
      "accountant"
    ]
  },

  {
    to: "/schools",
    label: "Schools",
    icon: School,

    roles: [
      "super_admin"
    ]
  },

  {
    to: "/users",
    label: "Users",
    icon: Users,

    roles: [
      "super_admin",
      "principal"
    ]
  },

  {
    to: "/classes",
    label: "Classes",
    icon: GraduationCap,

    roles: [
      "super_admin",
      "principal",
      "teacher"
    ]
  },

  {
    to: "/subjects",
    label: "Subjects",
    icon: BookOpen,

    roles: [
      "super_admin",
      "principal",
      "teacher"
    ]
  },

  {
    to: "/teachers",
    label: "Teachers",
    icon: Users,

    roles: [
      "super_admin",
      "principal"
    ]
  },


  /*
  |--------------------------------------------------------------------------
  | Exam and Result Management Group
  |--------------------------------------------------------------------------
  |
  | Super Admin:
  | تمام schools کے exams دیکھ، create، edit، workflow manage، delete اور
  | restore کر سکتا ہے۔
  |
  | Principal:
  | اپنے school کے exams دیکھ اور مکمل exam workflow manage کر سکتا ہے۔
  |
  | Teacher:
  | Exam list اور exam details read-only دیکھ سکتا ہے۔
  |
  */

  {
    label: "Examinations",
    icon: ClipboardCheck,

    roles: [
      "super_admin",
      "principal",
      "teacher"
    ],

    children: [
      {
        to: "/exams",
        label: "Exam Records",
        icon: FileText,

        roles: [
          "super_admin",
          "principal",
          "teacher"
        ],

        isActive: (
          pathname
        ) => {
          if (
            pathname ===
            "/exams"
          ) {
            return true;
          }

          if (
            pathname ===
              "/exams/new" ||
            pathname ===
              "/exams/deleted"
          ) {
            return false;
          }

          return (
            /^\/exams\/[^/]+\/edit$/.test(
              pathname
            )
          );
        }
      },

      {
        to: "/exams/new",
        label: "New Exam",
        icon: Plus,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      },

      {
        to: "/exams/deleted",
        label: "Deleted Exams",
        icon: ArchiveRestore,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      }
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Timetable Management Group
  |--------------------------------------------------------------------------
  |
  | Super Admin:
  | تمام schools کے period settings، timetable builder، class timetable،
  | teacher timetable اور reports access کر سکتا ہے۔
  |
  | Principal:
  | اپنے school کا timetable configure، build، publish اور review کر سکتا ہے۔
  |
  | Teacher:
  | Period Settings read-only، Class Timetable، Teacher Timetable اور
  | Timetable Report دیکھ سکتا ہے۔ Timetable Builder access نہیں کر سکتا۔
  |
  */

  {
    label: "Timetable",
    icon: CalendarDays,

    roles: [
      "super_admin",
      "principal",
      "teacher"
    ],

    children: [
      {
        to:
          "/timetable/period-settings",

        label:
          "Period Settings",

        icon:
          Settings2,

        roles: [
          "super_admin",
          "principal",
          "teacher"
        ],

        end: true
      },

      {
        to:
          "/timetable/builder",

        label:
          "Timetable Builder",

        icon:
          LayoutGrid,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      },

      {
        to:
          "/timetable/class",

        label:
          "Class Timetable",

        icon:
          GraduationCap,

        roles: [
          "super_admin",
          "principal",
          "teacher"
        ],

        end: true
      },

      {
        to:
          "/timetable/teacher",

        label:
          "Teacher Timetable",

        icon:
          Users,

        roles: [
          "super_admin",
          "principal",
          "teacher"
        ],

        end: true
      },

      {
        to:
          "/timetable/report",

        label:
          "Timetable Report",

        icon:
          BarChart3,

        roles: [
          "super_admin",
          "principal",
          "teacher"
        ],

        end: true
      }
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Staff Management Group
  |--------------------------------------------------------------------------
  */

  {
    label: "Staff",
    icon: BriefcaseBusiness,

    roles: [
      "super_admin",
      "principal",
      "accountant"
    ],

    children: [
      {
        to: "/staff",
        label: "Staff Records",
        icon: Users,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        isActive: (
          pathname
        ) => {
          if (
            pathname ===
            "/staff"
          ) {
            return true;
          }

          /*
          |--------------------------------------------------------------------------
          | Staff detail route:
          |--------------------------------------------------------------------------
          |
          | /staff/:id
          |
          | /staff/deleted کو Staff Records active نہیں کرنا۔
          |
          */

          return (
            /^\/staff\/[^/]+$/.test(
              pathname
            ) &&
            pathname !==
              "/staff/deleted"
          );
        }
      },

      {
        to:
          "/staff-attendance",

        label:
          "Daily Attendance",

        icon:
          CalendarCheck,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        end: true
      },

      {
        to:
          "/staff-attendance/history",

        label:
          "Attendance History",

        icon:
          History,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        end: true
      },

      {
        to:
          "/staff-attendance/report",

        label:
          "Monthly Report",

        icon:
          BarChart3,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        end: true
      },

      {
        to:
          "/staff/deleted",

        label:
          "Deleted Staff",

        icon:
          Trash2,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      },

      {
        to:
          "/staff-attendance/deleted",

        label:
          "Deleted Attendance",

        icon:
          ArchiveRestore,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      }
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Staff Leave Management Group
  |--------------------------------------------------------------------------
  |
  | Super Admin:
  | تمام schools کی leave requests دیکھ اور manage کر سکتا ہے۔
  |
  | Principal:
  | اپنے school کی leave requests create، approve، reject، cancel، delete
  | اور restore کر سکتا ہے۔
  |
  | Accountant:
  | Leave requests، details اور report صرف دیکھ سکتا ہے۔
  |
  */

  {
    label: "Staff Leaves",
    icon: CalendarDays,

    roles: [
      "super_admin",
      "principal",
      "accountant"
    ],

    children: [
      {
        to: "/staff-leaves",
        label: "Leave Requests",
        icon: FileText,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        isActive: (
          pathname
        ) => {
          if (
            pathname ===
            "/staff-leaves"
          ) {
            return true;
          }

          /*
          |--------------------------------------------------------------------------
          | Leave detail and edit routes:
          |--------------------------------------------------------------------------
          |
          | /staff-leaves/:id
          | /staff-leaves/:id/edit
          |
          | New، Report اور Deleted routes کو الگ menu items دیے گئے ہیں۔
          |
          */

          if (
            pathname ===
              "/staff-leaves/new" ||
            pathname ===
              "/staff-leaves/report" ||
            pathname ===
              "/staff-leaves/deleted"
          ) {
            return false;
          }

          return (
            /^\/staff-leaves\/[^/]+$/.test(
              pathname
            ) ||
            /^\/staff-leaves\/[^/]+\/edit$/.test(
              pathname
            )
          );
        }
      },

      {
        to:
          "/staff-leaves/new",

        label:
          "New Leave Request",

        icon:
          Plus,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      },

      {
        to:
          "/staff-leaves/report",

        label:
          "Leave Report",

        icon:
          BarChart3,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        end: true
      },

      {
        to:
          "/staff-leaves/deleted",

        label:
          "Deleted Leaves",

        icon:
          ArchiveRestore,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      }
    ]
  },

  {
    to: "/students",
    label: "Students",
    icon: GraduationCap,

    roles: [
      "super_admin",
      "principal",
      "teacher",
      "accountant"
    ]
  },

  {
    to: "/attendance",
    label: "Student Attendance",
    icon: CalendarCheck,

    roles: [
      "super_admin",
      "principal",
      "teacher"
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Payroll Management Group
  |--------------------------------------------------------------------------
  |
  | Super Admin:
  | تمام schools کی payroll اور salary structures access کر سکتا ہے۔
  |
  | Principal:
  | اپنے school کی payroll اور salary structures manage کر سکتا ہے۔
  |
  | Accountant:
  | Payroll process اور salary structures view کر سکتا ہے۔
  | Deleted records access نہیں کر سکتا۔
  |
  */

  {
    label: "Payroll",
    icon: WalletCards,

    roles: [
      "super_admin",
      "principal",
      "accountant"
    ],

    children: [
      {
        to: "/payroll",
        label: "Payroll Records",
        icon: CircleDollarSign,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        isActive: (
          pathname
        ) => {
          if (
            pathname ===
            "/payroll"
          ) {
            return true;
          }

          /*
          |--------------------------------------------------------------------------
          | Payroll details and payslip routes:
          |--------------------------------------------------------------------------
          |
          | /payroll/:id
          | /payroll/:id/payslip
          |
          | Salary Structures اور Deleted Payroll exclude کیے گئے ہیں۔
          |
          */

          if (
            pathname ===
              "/payroll/deleted" ||
            pathname.startsWith(
              "/payroll/salary-structures"
            )
          ) {
            return false;
          }

          return (
            /^\/payroll\/[^/]+$/.test(
              pathname
            ) ||
            /^\/payroll\/[^/]+\/payslip$/.test(
              pathname
            )
          );
        }
      },

      {
        to:
          "/payroll/salary-structures",

        label:
          "Salary Structures",

        icon:
          Settings2,

        roles: [
          "super_admin",
          "principal",
          "accountant"
        ],

        isActive: (
          pathname
        ) => {
          if (
            pathname ===
            "/payroll/salary-structures"
          ) {
            return true;
          }

          /*
          |--------------------------------------------------------------------------
          | Salary Structure routes:
          |--------------------------------------------------------------------------
          |
          | /payroll/salary-structures/new
          | /payroll/salary-structures/:id
          | /payroll/salary-structures/:id/edit
          |
          | Deleted route کو الگ active item دیا گیا ہے۔
          |
          */

          return (
            pathname.startsWith(
              "/payroll/salary-structures/"
            ) &&
            pathname !==
              "/payroll/salary-structures/deleted"
          );
        }
      },

      {
        to:
          "/payroll/salary-structures/deleted",

        label:
          "Deleted Structures",

        icon:
          ArchiveRestore,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      },

      {
        to:
          "/payroll/deleted",

        label:
          "Deleted Payroll",

        icon:
          Trash2,

        roles: [
          "super_admin",
          "principal"
        ],

        end: true
      }
    ]
  },

  {
    to: "/fee-structures",
    label: "Fee Structures",
    icon: Wallet,

    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  {
    to: "/fee-collections",
    label: "Fee Collections",
    icon: Receipt,

    roles: [
      "super_admin",
      "principal",
      "accountant"
    ]
  },

  /*
  |--------------------------------------------------------------------------
  | Principal Portal Messages
  |--------------------------------------------------------------------------
  |
  | صرف Principal اپنے school کے Parent اور Student conversations دیکھ اور
  | reply کر سکتا ہے۔
  |
  */

  {
    to: "/portal-messages",
    label: "Portal Messages",
    icon: MessageSquareText,

    roles: [
      "principal"
    ],

    end: true
  },

  {
    to: "/audit-logs",
    label: "Audit Logs",
    icon: ShieldCheck,

    roles: [
      "super_admin",
      "principal"
    ]
  }
];

/*
|--------------------------------------------------------------------------
| Formatting Helper
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

/*
|--------------------------------------------------------------------------
| Check Navigation Item Active State
|--------------------------------------------------------------------------
*/

const isNavigationActive = (
  item,
  pathname
) => {
  if (
    typeof item.isActive ===
    "function"
  ) {
    return item.isActive(
      pathname
    );
  }

  if (item.end) {
    return (
      pathname === item.to
    );
  }

  return (
    pathname === item.to ||
    pathname.startsWith(
      `${item.to}/`
    )
  );
};

/*
|--------------------------------------------------------------------------
| Sidebar Component
|--------------------------------------------------------------------------
*/

export const Sidebar = ({
  open,
  onClose
}) => {
  const location =
    useLocation();

  const {
    user
  } = useAuth();

  const userRole =
    String(
      user?.role || ""
    ).toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Expandable Menu State
  |--------------------------------------------------------------------------
  */

  const [
    openGroups,
    setOpenGroups
  ] = useState({
    Examinations: false,
    Timetable: false,
    Staff: false,
    "Staff Leaves": false,
    Payroll: false
  });

  /*
  |--------------------------------------------------------------------------
  | Filter Navigation by Role
  |--------------------------------------------------------------------------
  */

  const allowedNavigation =
    useMemo(() => {
      return navItems
        .filter(
          (item) =>
            item.roles.includes(
              userRole
            )
        )
        .map((item) => {
          if (
            !Array.isArray(
              item.children
            )
          ) {
            return item;
          }

          return {
            ...item,

            children:
              item.children.filter(
                (child) =>
                  child.roles.includes(
                    userRole
                  )
              )
          };
        })
        .filter((item) => {
          if (
            !Array.isArray(
              item.children
            )
          ) {
            return true;
          }

          return (
            item.children.length >
            0
          );
        });
    }, [
      userRole
    ]);

  /*
  |--------------------------------------------------------------------------
  | Automatically Open Active Group
  |--------------------------------------------------------------------------
  |
  | Examinations، Timetable، Staff، Staff Leaves یا Payroll کے کسی child
  | route پر جانے سے متعلق submenu خود open ہو جائے گا۔
  |
  */

  useEffect(() => {
    const activeGroups = {};

    allowedNavigation.forEach(
      (item) => {
        if (
          !Array.isArray(
            item.children
          )
        ) {
          return;
        }

        const groupIsActive =
          item.children.some(
            (child) =>
              isNavigationActive(
                child,
                location.pathname
              )
          );

        if (groupIsActive) {
          activeGroups[
            item.label
          ] = true;
        }
      }
    );

    if (
      Object.keys(
        activeGroups
      ).length > 0
    ) {
      setOpenGroups(
        (current) => ({
          ...current,
          ...activeGroups
        })
      );
    }
  }, [
    allowedNavigation,
    location.pathname
  ]);

  /*
  |--------------------------------------------------------------------------
  | Toggle Navigation Group
  |--------------------------------------------------------------------------
  */

  const toggleGroup = (
    groupLabel
  ) => {
    setOpenGroups(
      (current) => ({
        ...current,

        [groupLabel]:
          !current[groupLabel]
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | User and School Information
  |--------------------------------------------------------------------------
  */

  const sidebarTitle =
    userRole ===
    "super_admin"
      ? "Super Admin"
      : user?.schoolId
          ?.schoolName ||
        user?.school
          ?.schoolName ||
        formatRole(
          userRole
        );

  const sidebarSubtitle =
    formatRole(
      userRole
    );

  const logoLetter =
    sidebarTitle
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() ||
    "S";

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <>
      {/*
      |--------------------------------------------------------------------------
      | Mobile Overlay
      |--------------------------------------------------------------------------
      */}

      {open && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
        />
      )}

      {/*
      |--------------------------------------------------------------------------
      | Fixed Sidebar
      |--------------------------------------------------------------------------
      */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col overflow-hidden bg-ink-900 shadow-xl transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/*
        |--------------------------------------------------------------------------
        | Sidebar Header
        |--------------------------------------------------------------------------
        */}

        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/5 px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-sm">
              {logoLetter}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {sidebarTitle}
              </p>

              {userRole !==
                "super_admin" && (
                <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  {sidebarSubtitle}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Navigation
        |--------------------------------------------------------------------------
        */}

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4">
          {allowedNavigation.map(
            (item) => {
              const Icon =
                item.icon;

              /*
              |--------------------------------------------------------------------------
              | Standard Navigation Link
              |--------------------------------------------------------------------------
              */

              if (
                !Array.isArray(
                  item.children
                )
              ) {
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({
                      isActive
                    }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-500 text-white shadow-sm"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <Icon
                      size={17}
                      strokeWidth={2}
                      className="shrink-0"
                    />

                    <span className="truncate">
                      {item.label}
                    </span>
                  </NavLink>
                );
              }

              /*
              |--------------------------------------------------------------------------
              | Expandable Navigation Group
              |--------------------------------------------------------------------------
              */

              const groupIsOpen =
                Boolean(
                  openGroups[
                    item.label
                  ]
                );

              const groupIsActive =
                item.children.some(
                  (child) =>
                    isNavigationActive(
                      child,
                      location.pathname
                    )
                );

              return (
                <div
                  key={item.label}
                  className="space-y-1"
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleGroup(
                        item.label
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      groupIsActive
                        ? "bg-white/[0.07] text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                    aria-expanded={
                      groupIsOpen
                    }
                  >
                    <Icon
                      size={17}
                      strokeWidth={2}
                      className="shrink-0"
                    />

                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>

                    <ChevronDown
                      size={15}
                      className={`shrink-0 transition-transform duration-200 ${
                        groupIsOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {groupIsOpen && (
                    <div className="ml-5 space-y-1 border-l border-white/10 pl-3">
                      {item.children.map(
                        (child) => {
                          const ChildIcon =
                            child.icon;

                          return (
                            <NavLink
                              key={
                                child.to
                              }
                              to={
                                child.to
                              }
                              end={
                                child.end
                              }
                              onClick={
                                onClose
                              }
                              className={({
                                isActive
                              }) => {
                                const childIsActive =
                                  typeof child.isActive ===
                                  "function"
                                    ? child.isActive(
                                        location.pathname
                                      )
                                    : isActive;

                                return `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                                  childIsActive
                                    ? "bg-brand-500 text-white shadow-sm"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                }`;
                              }}
                            >
                              <ChildIcon
                                size={15}
                                strokeWidth={2}
                                className="shrink-0"
                              />

                              <span className="truncate">
                                {child.label}
                              </span>
                            </NavLink>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </nav>

        {/*
        |--------------------------------------------------------------------------
        | Sidebar Footer
        |--------------------------------------------------------------------------
        */}

        <div className="shrink-0 border-t border-white/5 px-4 py-4">
          <div className="rounded-xl bg-white/[0.04] px-3 py-3">
            <p className="truncate text-xs font-semibold text-slate-300">
              {user?.name ||
                "System User"}
            </p>

            <p className="mt-1 truncate text-[11px] text-slate-500">
              {user?.email ||
                sidebarSubtitle}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;