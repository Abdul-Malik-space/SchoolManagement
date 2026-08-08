import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  Clock3,
  GraduationCap,
  FileText,
  Home,
  KeyRound,
  LogOut,
  Menu,
  MessageCircle,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WalletCards,
  X
} from "lucide-react";

import {
  getParentPortalOverview
} from "../../api/parentPortal";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Parent Portal Navigation
|--------------------------------------------------------------------------
*/

const navigationItems = [
  {
    label:
      "Overview",

    description:
      "Family dashboard",

    path:
      "/parent-portal",

    icon:
      Home,

    end:
      true
  },

  {
    label:
      "My Children",

    description:
      "Linked student profiles",

    path:
      "/parent-portal/children",

    icon:
      UsersRound
  },

  {
    label:
      "Attendance",

    description:
      "Daily attendance record",

    path:
      "/parent-portal/attendance",

    icon:
      CalendarCheck2
  },

  {
    label:
      "Fee Status",

    description:
      "Invoices and receipts",

    path:
      "/parent-portal/fees",

    icon:
      WalletCards
  },

  {
    label:
      "Class Timetable",

    description:
      "Weekly class schedule",

    path:
      "/parent-portal/timetable",

    icon:
      Clock3
  },

  {
    label:
      "Academics",

    description:
      "Subjects and progress",

    path:
      "/parent-portal/academics",

    icon:
      GraduationCap
  },

  {
    label:
      "Results & Report Cards",

    description:
      "Published exams and reports",

    path:
      "/parent-portal/results",

    icon:
      FileText
  },

  {
    label:
      "Notices",

    description:
      "School announcements",

    path:
      "/parent-portal/notices",

    icon:
      Bell
  },

  {
    label:
      "Messages",

    description:
      "Talk with the principal",

    path:
      "/parent-portal/messages",

    icon:
      MessageCircle,

    badgeKey:
      "unreadMessages"
  }
];

/*
|--------------------------------------------------------------------------
| Page Titles
|--------------------------------------------------------------------------
*/

const pageDetails = {
  "/parent-portal": {
    title:
      "Parent Overview",

    subtitle:
      "A complete view of your children’s school activity."
  },

  "/parent-portal/children": {
    title:
      "My Children",

    subtitle:
      "View and manage your linked student profiles."
  },

  "/parent-portal/attendance": {
    title:
      "Attendance",

    subtitle:
      "Track daily presence, absence and leave records."
  },

  "/parent-portal/fees": {
    title:
      "Fee Status",

    subtitle:
      "Review invoices, payments, balances and receipts."
  },

  "/parent-portal/timetable": {
    title:
      "Class Timetable",

    subtitle:
      "See the complete weekly class schedule."
  },

  "/parent-portal/academics": {
    title:
      "Academic Progress",

    subtitle:
      "Review subjects, teachers and academic updates."
  },

  "/parent-portal/results": {
    title:
      "Results & Report Cards",

    subtitle:
      "Review published examination results and official report cards."
  },

  "/parent-portal/notices": {
    title:
      "Notices & Announcements",

    subtitle:
      "Stay informed about important school updates."
  },

  "/parent-portal/messages": {
    title:
      "Messages with Principal",

    subtitle:
      "Discuss your child’s progress directly with the school."
  },

  "/parent-portal/profile": {
    title:
      "Parent Profile",

    subtitle:
      "Review your account and contact information."
  }
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getErrorMessage = (
  error
) => {
  return (
    error?.response?.data
      ?.message ||
    error?.message ||
    "Unable to load the parent portal."
  );
};

const getInitials = (
  value
) => {
  return String(
    value || "Parent"
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (part) =>
        part[0]
    )
    .slice(
      0,
      2
    )
    .join("")
    .toUpperCase();
};

const formatClassName = (
  student
) => {
  const className =
    student?.class
      ?.className ||
    "";

  const sectionName =
    student?.sectionName ||
    "";

  if (
    className &&
    sectionName
  ) {
    return `${className} · ${sectionName}`;
  }

  return (
    className ||
    sectionName ||
    "Class not assigned"
  );
};

const getPageInformation = (
  pathname
) => {
  if (
    pageDetails[
      pathname
    ]
  ) {
    return pageDetails[
      pathname
    ];
  }

  if (
    pathname.startsWith(
      "/parent-portal/messages/"
    )
  ) {
    return {
      title:
        "Conversation",

      subtitle:
        "Secure communication with the school principal."
    };
  }

  if (
    pathname.startsWith(
      "/parent-portal/children/"
    )
  ) {
    return {
      title:
        "Student Profile",

      subtitle:
        "Detailed information about your child."
    };
  }

  return {
    title:
      "Parent Portal",

    subtitle:
      "Stay connected with your child’s school."
  };
};

/*
|--------------------------------------------------------------------------
| Parent Portal Layout
|--------------------------------------------------------------------------
*/

const ParentPortalLayout =
  () => {
    const navigate =
      useNavigate();

    const location =
      useLocation();

    const {
      user,
      logout
    } = useAuth();

    const profileRef =
      useRef(null);

    const childMenuRef =
      useRef(null);

    const requestControllerRef =
      useRef(null);

    const [
      sidebarOpen,
      setSidebarOpen
    ] = useState(false);

    const [
      profileOpen,
      setProfileOpen
    ] = useState(false);

    const [
      childMenuOpen,
      setChildMenuOpen
    ] = useState(false);

    const [
      overview,
      setOverview
    ] = useState(null);

    const [
      loading,
      setLoading
    ] = useState(true);

    const [
      refreshing,
      setRefreshing
    ] = useState(false);

    const [
      error,
      setError
    ] = useState("");

    const [
      selectedChildId,
      setSelectedChildId
    ] = useState("");

    const [
      loggingOut,
      setLoggingOut
    ] = useState(false);

    const userId =
      user?._id ||
      user?.id ||
      "parent";

    const selectedChildStorageKey =
      `parentPortal:selectedChild:${userId}`;

    /*
    |--------------------------------------------------------------------------
    | Load Portal Overview
    |--------------------------------------------------------------------------
    */

    const loadOverview =
      useCallback(
        async ({
          silent = false
        } = {}) => {
          requestControllerRef
            .current
            ?.abort();

          const controller =
            new AbortController();

          requestControllerRef
            .current =
            controller;

          if (silent) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError("");

          try {
            const response =
              await getParentPortalOverview({
                signal:
                  controller.signal
              });

            const data =
              response?.data
                ?.data ||
              null;

            setOverview(
              data
            );

            const children =
              Array.isArray(
                data?.children
              )
                ? data.children
                : [];

            const availableIds =
              children
                .map(
                  (item) =>
                    String(
                      item?.student
                        ?.id ||
                      ""
                    )
                )
                .filter(Boolean);

            const storedChildId =
              window.localStorage
                .getItem(
                  selectedChildStorageKey
                );

            setSelectedChildId(
              (
                currentId
              ) => {
                if (
                  currentId &&
                  availableIds.includes(
                    String(
                      currentId
                    )
                  )
                ) {
                  return currentId;
                }

                if (
                  storedChildId &&
                  availableIds.includes(
                    storedChildId
                  )
                ) {
                  return storedChildId;
                }

                return (
                  availableIds[0] ||
                  ""
                );
              }
            );
          } catch (
            requestError
          ) {
            if (
              requestError?.name ===
                "CanceledError" ||
              requestError?.code ===
                "ERR_CANCELED"
            ) {
              return;
            }

            setError(
              getErrorMessage(
                requestError
              )
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setLoading(
                false
              );

              setRefreshing(
                false
              );
            }
          }
        },
        [
          selectedChildStorageKey
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Initial Load and Automatic Refresh
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      loadOverview();

      const intervalId =
        window.setInterval(
          () => {
            loadOverview({
              silent: true
            });
          },
          60000
        );

      const handleVisibilityChange =
        () => {
          if (
            document
              .visibilityState ===
            "visible"
          ) {
            loadOverview({
              silent: true
            });
          }
        };

      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      return () => {
        window.clearInterval(
          intervalId
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );

        requestControllerRef
          .current
          ?.abort();
      };
    }, [
      loadOverview
    ]);

    /*
    |--------------------------------------------------------------------------
    | Persist Selected Child
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        selectedChildId
      ) {
        window.localStorage
          .setItem(
            selectedChildStorageKey,
            selectedChildId
          );
      }
    }, [
      selectedChildId,
      selectedChildStorageKey
    ]);

    /*
    |--------------------------------------------------------------------------
    | Close Menus on Route Change
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      setSidebarOpen(
        false
      );

      setProfileOpen(
        false
      );

      setChildMenuOpen(
        false
      );
    }, [
      location.pathname
    ]);

    /*
    |--------------------------------------------------------------------------
    | Close Dropdowns on Outside Click
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const handlePointerDown =
        (
          event
        ) => {
          if (
            profileRef.current &&
            !profileRef.current
              .contains(
                event.target
              )
          ) {
            setProfileOpen(
              false
            );
          }

          if (
            childMenuRef.current &&
            !childMenuRef.current
              .contains(
                event.target
              )
          ) {
            setChildMenuOpen(
              false
            );
          }
        };

      document.addEventListener(
        "mousedown",
        handlePointerDown
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown
        );
      };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Derived Portal Data
    |--------------------------------------------------------------------------
    */

    const children =
      useMemo(
        () => {
          return Array.isArray(
            overview?.children
          )
            ? overview.children
            : [];
        },
        [
          overview
        ]
      );

    const selectedChild =
      useMemo(
        () => {
          return (
            children.find(
              (item) =>
                String(
                  item?.student
                    ?.id
                ) ===
                String(
                  selectedChildId
                )
            ) ||
            children[0] ||
            null
          );
        },
        [
          children,
          selectedChildId
        ]
      );

    const selectedStudent =
      selectedChild
        ?.student ||
      null;

    const school =
      overview?.school ||
      selectedStudent
        ?.school ||
      null;

    const unreadMessages =
      Number(
        overview?.summary
          ?.unreadMessages ||
        0
      );

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

    const portalContext =
      useMemo(
        () => ({
          overview,
          loading,
          refreshing,
          error,
          children,
          selectedChild,
          selectedChildId,

          setSelectedChildId:
            (
              childId
            ) => {
              setSelectedChildId(
                String(
                  childId ||
                  ""
                )
              );
            },

          refreshOverview:
            () =>
              loadOverview({
                silent: true
              })
        }),
        [
          overview,
          loading,
          refreshing,
          error,
          children,
          selectedChild,
          selectedChildId,
          loadOverview
        ]
      );

    const parentInitials =
      getInitials(
        overview?.parent
          ?.name ||
        user?.name
      );

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

        setLoggingOut(
          true
        );

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
            "Parent portal logout error:",
            logoutError
          );
        } finally {
          setLoggingOut(
            false
          );
        }
      };

    /*
    |--------------------------------------------------------------------------
    | Sidebar Content
    |--------------------------------------------------------------------------
    */

    const renderSidebar =
      () => {
        return (
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-5 py-5">
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                onClick={() =>
                  navigate(
                    "/parent-portal"
                  )
                }
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
                  <School
                    size={22}
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {school
                      ?.schoolName ||
                      "School Portal"}
                  </p>

                  <p className="mt-0.5 truncate text-[11px] font-medium text-slate-300">
                    Parent Access
                  </p>
                </div>
              </button>
            </div>

            <div className="px-4 pt-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-sm font-bold text-emerald-200 ring-1 ring-emerald-300/20">
                    {getInitials(
                      selectedStudent
                        ?.name ||
                      "Child"
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Active Child
                    </p>

                    <p className="mt-1 truncate text-sm font-bold text-white">
                      {selectedStudent
                        ?.name ||
                        "No child linked"}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-slate-300">
                      {selectedStudent
                        ? formatClassName(
                            selectedStudent
                          )
                        : "Contact the school administrator"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Parent Menu
              </p>

              {navigationItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const badgeValue =
                    item.badgeKey
                      ? Number(
                          overview
                            ?.summary
                            ?.[
                              item
                                .badgeKey
                            ] ||
                          0
                        )
                      : 0;

                  return (
                    <NavLink
                      key={
                        item.path
                      }
                      to={
                        item.path
                      }
                      end={
                        item.end
                      }
                      className={({
                        isActive
                      }) => {
                        return `group flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                          isActive
                            ? "bg-white text-slate-950 shadow-sm"
                            : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                        }`;
                      }}
                    >
                      {({
                        isActive
                      }) => (
                        <>
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                              isActive
                                ? "bg-brand-50 text-brand-700"
                                : "bg-white/[0.05] text-slate-400 group-hover:bg-white/[0.09] group-hover:text-white"
                            }`}
                          >
                            <Icon
                              size={17}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {item.label}
                            </p>

                            <p
                              className={`mt-0.5 truncate text-[10px] ${
                                isActive
                                  ? "text-slate-500"
                                  : "text-slate-500 group-hover:text-slate-400"
                              }`}
                            >
                              {item.description}
                            </p>
                          </div>

                          {badgeValue >
                            0 && (
                            <span className="flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {badgeValue >
                              99
                                ? "99+"
                                : badgeValue}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                }
              )}
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="rounded-2xl bg-gradient-to-br from-brand-500/20 to-cyan-400/10 p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-emerald-200">
                  <ShieldCheck
                    size={16}
                  />

                  <p className="text-xs font-bold">
                    Secure Family Access
                  </p>
                </div>

                <p className="mt-2 text-[11px] leading-5 text-slate-300">
                  Your child’s information is protected and available only through your verified parent account.
                </p>
              </div>
            </div>
          </div>
        );
      };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-hidden bg-slate-950 shadow-2xl lg:block">
          {renderSidebar()}
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-[90] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              aria-label="Close parent portal menu"
              onClick={() =>
                setSidebarOpen(
                  false
                )
              }
            />

            <aside className="relative h-full w-[86%] max-w-[320px] overflow-hidden bg-slate-950 shadow-2xl">
              <button
                type="button"
                className="absolute right-3 top-3 z-10 rounded-xl bg-white/10 p-2 text-slate-300 transition hover:bg-white/15 hover:text-white"
                onClick={() =>
                  setSidebarOpen(
                    false
                  )
                }
                aria-label="Close menu"
              >
                <X
                  size={18}
                />
              </button>

              {renderSidebar()}
            </aside>
          </div>
        )}

        <div className="min-h-screen lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 xl:px-8">
              <button
                type="button"
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:hidden"
                onClick={() =>
                  setSidebarOpen(
                    true
                  )
                }
                aria-label="Open parent portal menu"
              >
                <Menu
                  size={20}
                />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                    {pageInformation
                      .title}
                  </h1>

                  {refreshing && (
                    <RefreshCw
                      size={14}
                      className="animate-spin text-brand-600"
                    />
                  )}
                </div>

                <p className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">
                  {pageInformation
                    .subtitle}
                </p>
              </div>

              <div
                ref={
                  childMenuRef
                }
                className="relative hidden sm:block"
              >
                <button
                  type="button"
                  className="flex min-w-[210px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-brand-200 hover:bg-brand-50/40"
                  onClick={() => {
                    setChildMenuOpen(
                      (
                        current
                      ) =>
                        !current
                    );

                    setProfileOpen(
                      false
                    );
                  }}
                  disabled={
                    children.length ===
                    0
                  }
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700">
                    {getInitials(
                      selectedStudent
                        ?.name ||
                      "Child"
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      Viewing
                    </p>

                    <p className="truncate text-xs font-bold text-slate-800">
                      {selectedStudent
                        ?.name ||
                        "No child linked"}
                    </p>
                  </div>

                  <ChevronDown
                    size={15}
                    className={`text-slate-400 transition-transform ${
                      childMenuOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {childMenuOpen && (
                  <div className="absolute right-0 top-[52px] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-bold text-slate-800">
                        Select a child
                      </p>

                      <p className="mt-0.5 text-xs text-slate-400">
                        Portal information updates automatically.
                      </p>
                    </div>

                    <div className="max-h-72 overflow-y-auto p-2">
                      {children.length >
                      0 ? (
                        children.map(
                          (
                            item
                          ) => {
                            const student =
                              item
                                ?.student;

                            const active =
                              String(
                                student
                                  ?.id
                              ) ===
                              String(
                                selectedChildId
                              );

                            return (
                              <button
                                key={
                                  student
                                    ?.id
                                }
                                type="button"
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                                  active
                                    ? "bg-brand-50"
                                    : "hover:bg-slate-50"
                                }`}
                                onClick={() => {
                                  setSelectedChildId(
                                    String(
                                      student
                                        ?.id ||
                                      ""
                                    )
                                  );

                                  setChildMenuOpen(
                                    false
                                  );
                                }}
                              >
                                <div
                                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                    active
                                      ? "bg-brand-600 text-white"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {getInitials(
                                    student
                                      ?.name
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-slate-800">
                                    {student
                                      ?.name ||
                                      "Student"}
                                  </p>

                                  <p className="mt-0.5 truncate text-xs text-slate-400">
                                    {formatClassName(
                                      student
                                    )}
                                  </p>
                                </div>

                                {active && (
                                  <span className="rounded-full bg-brand-100 px-2 py-1 text-[10px] font-bold text-brand-700">
                                    Active
                                  </span>
                                )}
                              </button>
                            );
                          }
                        )
                      ) : (
                        <div className="px-4 py-8 text-center">
                          <UsersRound
                            size={28}
                            className="mx-auto text-slate-300"
                          />

                          <p className="mt-3 text-sm font-semibold text-slate-700">
                            No child linked
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            Contact the school administration to link your child.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 md:inline-flex"
                onClick={() =>
                  loadOverview({
                    silent: true
                  })
                }
                disabled={
                  refreshing
                }
                aria-label="Refresh parent portal"
                title="Refresh portal"
              >
                <RefreshCw
                  size={18}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>

              <button
                type="button"
                className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700"
                onClick={() =>
                  navigate(
                    "/parent-portal/messages"
                  )
                }
                aria-label="Open messages"
                title="Messages with principal"
              >
                <MessageCircle
                  size={19}
                />

                {unreadMessages >
                  0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                    {unreadMessages >
                    99
                      ? "99+"
                      : unreadMessages}
                  </span>
                )}
              </button>

              <div
                ref={
                  profileRef
                }
                className="relative"
              >
                <button
                  type="button"
                  className={`flex items-center gap-2 rounded-2xl p-1.5 pr-2 transition ${
                    profileOpen
                      ? "bg-slate-100"
                      : "hover:bg-slate-100"
                  }`}
                  onClick={() => {
                    setProfileOpen(
                      (
                        current
                      ) =>
                        !current
                    );

                    setChildMenuOpen(
                      false
                    );
                  }}
                  aria-expanded={
                    profileOpen
                  }
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-cyan-600 text-xs font-bold text-white shadow-sm">
                    {parentInitials}
                  </div>

                  <div className="hidden max-w-36 text-left xl:block">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {overview
                        ?.parent
                        ?.name ||
                        user?.name ||
                        "Parent"}
                    </p>

                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                      Parent Account
                    </p>
                  </div>

                  <ChevronDown
                    size={14}
                    className={`hidden text-slate-400 transition-transform sm:block ${
                      profileOpen
                        ? "rotate-180"
                        : ""
                    }`}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-[52px] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="bg-gradient-to-br from-slate-950 to-slate-800 p-4 text-white">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold ring-1 ring-white/15">
                          {parentInitials}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {overview
                              ?.parent
                              ?.name ||
                              user?.name ||
                              "Parent"}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-300">
                            {overview
                              ?.parent
                              ?.email ||
                              user?.email ||
                              "Verified parent account"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-slate-100 p-3">
                      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5">
                        <ShieldCheck
                          size={17}
                          className="text-emerald-600"
                        />

                        <div>
                          <p className="text-xs font-bold text-emerald-800">
                            Account Protected
                          </p>

                          <p className="mt-0.5 text-[10px] text-emerald-600">
                            Secure school portal access
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        onClick={() =>
                          navigate(
                            "/parent-portal/profile"
                          )
                        }
                      >
                        <CircleUserRound
                          size={17}
                        />

                        Parent Profile
                      </button>

                      <button
                        type="button"
                        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
                        onClick={() =>
                          navigate(
                            "/change-password"
                          )
                        }
                      >
                        <KeyRound
                          size={17}
                        />

                        Change Password
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

            {children.length >
              0 && (
              <div className="border-t border-slate-100 px-4 py-2 sm:hidden">
                <label className="sr-only">
                  Select child
                </label>

                <select
                  value={
                    selectedChildId
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedChildId(
                      event.target
                        .value
                    )
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
                >
                  {children.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item
                            ?.student
                            ?.id
                        }
                        value={
                          item
                            ?.student
                            ?.id ||
                          ""
                        }
                      >
                        {item
                          ?.student
                          ?.name ||
                          "Student"}{" "}
                        —{" "}
                        {formatClassName(
                          item
                            ?.student
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}
          </header>

          <main className="px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
            {error && (
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-rose-800">
                    Parent portal could not refresh
                  </p>

                  <p className="mt-1 text-xs text-rose-600">
                    {error}
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-rose-700 shadow-sm ring-1 ring-rose-200 transition hover:bg-rose-100"
                  onClick={() =>
                    loadOverview()
                  }
                >
                  <RefreshCw
                    size={14}
                  />

                  Try Again
                </button>
              </div>
            )}

            {loading &&
            !overview ? (
              <div className="grid min-h-[65vh] place-items-center">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
                    <RefreshCw
                      size={24}
                      className="animate-spin text-brand-600"
                    />
                  </div>

                  <p className="mt-4 text-sm font-bold text-slate-800">
                    Preparing your family portal
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Loading children, attendance, fees and messages…
                  </p>
                </div>
              </div>
            ) : (
              <Outlet
                context={
                  portalContext
                }
              />
            )}
          </main>

          <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6 xl:px-8">
            <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={14}
                  className="text-brand-500"
                />

                <span>
                  Parent Portal · Secure family access
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CalendarDays
                  size={14}
                />

                <span>
                  Data refreshes automatically every minute
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    );
  };

export default ParentPortalLayout;