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
  BarChart3,
  Bell,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  Clock3,
  FileText,
  GraduationCap,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  ReceiptText,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
  Wifi,
  WifiOff,
  X
} from "lucide-react";

import {
  getStudentPortalOverview
} from "../../api/studentPortal";

import {
  useAuth
} from "../../context/AuthContext";

/*
|--------------------------------------------------------------------------
| Student Portal Navigation
|--------------------------------------------------------------------------
*/

const primaryNavigation = [
  {
    label:
      "Overview",

    description:
      "Your daily command centre",

    path:
      "/student-portal",

    icon:
      LayoutDashboard,

    capability:
      "dashboard",

    defaultAvailable:
      true,

    end:
      true
  },

  {
    label:
      "My Profile",

    description:
      "Profile and digital ID",

    path:
      "/student-portal/profile",

    icon:
      UserRound,

    capability:
      "profile",

    defaultAvailable:
      true,

    badgeType:
      "profile"
  },

  {
    label:
      "Attendance",

    description:
      "History, trends and risk",

    path:
      "/student-portal/attendance",

    icon:
      CalendarCheck2,

    capability:
      "attendance",

    defaultAvailable:
      true,

    badgeType:
      "attendance"
  },

  {
    label:
      "Class Timetable",

    description:
      "Today and weekly schedule",

    path:
      "/student-portal/timetable",

    icon:
      Clock3,

    capability:
      "timetable",

    defaultAvailable:
      true
  },

  {
    label:
      "Subjects",

    description:
      "Subjects and teachers",

    path:
      "/student-portal/subjects",

    icon:
      BookOpen,

    capability:
      "subjects",

    defaultAvailable:
      true
  },

  {
    label:
      "Academic Progress",

    description:
      "Performance and insights",

    path:
      "/student-portal/academics",

    icon:
      BarChart3,

    capability:
      "grades",

    defaultAvailable:
      true
  },

  {
    label:
      "Fees & Receipts",

    description:
      "Invoices and payments",

    path:
      "/student-portal/fees",

    icon:
      WalletCards,

    capability:
      "fees",

    defaultAvailable:
      true,

    badgeType:
      "fees"
  },

  {
    label:
      "Messages",

    description:
      "Contact the principal",

    path:
      "/student-portal/messages",

    icon:
      MessageCircle,

    capability:
      "messages",

    defaultAvailable:
      true,

    badgeType:
      "messages"
  }
];

const futureNavigation = [
  {
    label:
      "Assignments",

    description:
      "Tasks and submissions",

    path:
      "/student-portal/assignments",

    icon:
      ClipboardList,

    capability:
      "assignments",

    defaultAvailable:
      false
  },

  {
    label:
      "Exams & Report Cards",

    description:
      "Results and transcripts",

    path:
      "/student-portal/results",

    icon:
      GraduationCap,

    capability:
      "examinations",

    defaultAvailable:
      false
  },

  {
    label:
      "Study Planner",

    description:
      "Goals and revision plan",

    path:
      "/student-portal/study-planner",

    icon:
      Target,

    capability:
      "studyPlanner",

    defaultAvailable:
      false
  },

  {
    label:
      "Documents",

    description:
      "Certificates and files",

    path:
      "/student-portal/documents",

    icon:
      FileText,

    capability:
      "documents",

    defaultAvailable:
      false
  },

  {
    label:
      "Notices & Events",

    description:
      "School updates and calendar",

    path:
      "/student-portal/notices",

    icon:
      Bell,

    capability:
      "notices",

    defaultAvailable:
      false
  }
];

const mobileNavigation = [
  {
    label:
      "Home",

    path:
      "/student-portal",

    icon:
      LayoutDashboard,

    end:
      true
  },

  {
    label:
      "Timetable",

    path:
      "/student-portal/timetable",

    icon:
      Clock3
  },

  {
    label:
      "Attendance",

    path:
      "/student-portal/attendance",

    icon:
      CalendarCheck2
  },

  {
    label:
      "Messages",

    path:
      "/student-portal/messages",

    icon:
      MessageCircle,

    badgeType:
      "messages"
  }
];

/*
|--------------------------------------------------------------------------
| Page Information
|--------------------------------------------------------------------------
*/

const pageDetails = {
  "/student-portal": {
    title:
      "Student Overview",

    subtitle:
      "Your classes, attendance, fees and updates in one place."
  },

  "/student-portal/profile": {
    title:
      "My Profile & Digital ID",

    subtitle:
      "Review your official student information and digital identity."
  },

  "/student-portal/attendance": {
    title:
      "Attendance Intelligence",

    subtitle:
      "Track attendance history, trends and risk indicators."
  },

  "/student-portal/timetable": {
    title:
      "Class Timetable",

    subtitle:
      "View today’s classes and the complete weekly schedule."
  },

  "/student-portal/subjects": {
    title:
      "My Subjects",

    subtitle:
      "Explore your subjects and assigned teachers."
  },

  "/student-portal/academics": {
    title:
      "Academic Progress",

    subtitle:
      "Review academic information, performance and future insights."
  },

  "/student-portal/fees": {
    title:
      "Fees & Receipts",

    subtitle:
      "View invoices, payments, balances and receipt history."
  },

  "/student-portal/messages": {
    title:
      "Messages with Principal",

    subtitle:
      "Use secure school communication for questions and support."
  },

  "/student-portal/assignments": {
    title:
      "Assignments",

    subtitle:
      "Manage tasks, deadlines and submissions."
  },

  "/student-portal/results": {
    title:
      "Exams & Report Cards",

    subtitle:
      "View results, report cards and academic records."
  },

  "/student-portal/study-planner": {
    title:
      "Study Planner",

    subtitle:
      "Plan revision, goals and focused study sessions."
  },

  "/student-portal/documents": {
    title:
      "Student Documents",

    subtitle:
      "Access certificates, letters and school files."
  },

  "/student-portal/notices": {
    title:
      "Notices & Events",

    subtitle:
      "Stay informed about announcements and school activities."
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
    error?.response?.data
      ?.error ||
    error?.message ||
    "Unable to load the student portal."
  );
};

const getInitials = (
  value
) => {
  return String(
    value ||
    "Student"
  )
    .split(
      " "
    )
    .filter(
      Boolean
    )
    .map(
      (
        part
      ) =>
        part[0]
    )
    .slice(
      0,
      2
    )
    .join(
      ""
    )
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

const formatLastSync = (
  date
) => {
  if (!date) {
    return "Not synced yet";
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          date.getTime()
        ) /
          1000
      )
    );

  if (
    seconds <
    10
  ) {
    return "Synced just now";
  }

  if (
    seconds <
    60
  ) {
    return `Synced ${seconds}s ago`;
  }

  const minutes =
    Math.floor(
      seconds /
      60
    );

  if (
    minutes <
    60
  ) {
    return `Synced ${minutes}m ago`;
  }

  return `Synced at ${date.toLocaleTimeString(
    [],
    {
      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  )}`;
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
      "/student-portal/messages/"
    )
  ) {
    return {
      title:
        "Conversation",

      subtitle:
        "Secure communication with your school principal."
    };
  }

  return {
    title:
      "Student Portal",

    subtitle:
      "Your personalised school experience."
  };
};

const getAlertTone = (
  type
) => {
  if (
    type ===
    "critical"
  ) {
    return {
      container:
        "border-rose-200 bg-rose-50",

      icon:
        "bg-rose-100 text-rose-700",

      title:
        "text-rose-900",

      message:
        "text-rose-600"
    };
  }

  if (
    type ===
    "warning"
  ) {
    return {
      container:
        "border-amber-200 bg-amber-50",

      icon:
        "bg-amber-100 text-amber-700",

      title:
        "text-amber-900",

      message:
        "text-amber-700"
    };
  }

  return {
    container:
      "border-sky-200 bg-sky-50",

    icon:
      "bg-sky-100 text-sky-700",

    title:
      "text-sky-900",

    message:
      "text-sky-700"
  };
};

/*
|--------------------------------------------------------------------------
| Portal Avatar
|--------------------------------------------------------------------------
*/

const PortalAvatar = ({
  src,
  name,
  size =
    "h-10 w-10",
  textSize =
    "text-xs",
  className =
    ""
}) => {
  const [
    failed,
    setFailed
  ] = useState(false);

  useEffect(() => {
    setFailed(
      false
    );
  }, [
    src
  ]);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-cyan-600 font-bold text-white shadow-sm ${size} ${textSize} ${className}`}
    >
      {src &&
      !failed ? (
        <img
          src={src}
          alt={name || "Student"}
          className="h-full w-full object-cover"
          onError={() =>
            setFailed(
              true
            )
          }
        />
      ) : (
        getInitials(
          name
        )
      )}
    </div>
  );
};

/*
|--------------------------------------------------------------------------
| Student Portal Layout
|--------------------------------------------------------------------------
*/

const StudentPortalLayout =
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

    const notificationRef =
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
      notificationsOpen,
      setNotificationsOpen
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
      loggingOut,
      setLoggingOut
    ] = useState(false);

    const [
      online,
      setOnline
    ] = useState(
      typeof navigator ===
        "undefined"
        ? true
        : navigator.onLine
    );

    const [
      lastSyncedAt,
      setLastSyncedAt
    ] = useState(null);

    const [
      syncClock,
      setSyncClock
    ] = useState(0);

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

          if (
            silent
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            ""
          );

          try {
            const response =
              await getStudentPortalOverview(
                {},
                {
                  signal:
                    controller.signal
                }
              );

            const data =
              response?.data
                ?.data ||
              null;

            setOverview(
              data
            );

            setLastSyncedAt(
              new Date()
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
        []
      );

    /*
    |--------------------------------------------------------------------------
    | Initial Load and Automatic Refresh
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      loadOverview();

      const refreshInterval =
        window.setInterval(
          () => {
            if (
              navigator.onLine
            ) {
              loadOverview({
                silent:
                  true
              });
            }
          },
          60000
        );

      const syncLabelInterval =
        window.setInterval(
          () => {
            setSyncClock(
              (
                value
              ) =>
                value +
                1
            );
          },
          15000
        );

      const handleVisibilityChange =
        () => {
          if (
            document
              .visibilityState ===
              "visible" &&
            navigator.onLine
          ) {
            loadOverview({
              silent:
                true
            });
          }
        };

      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      return () => {
        window.clearInterval(
          refreshInterval
        );

        window.clearInterval(
          syncLabelInterval
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
    | Online and Offline Status
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      const handleOnline =
        () => {
          setOnline(
            true
          );

          loadOverview({
            silent:
              true
          });
        };

      const handleOffline =
        () => {
          setOnline(
            false
          );
        };

      window.addEventListener(
        "online",
        handleOnline
      );

      window.addEventListener(
        "offline",
        handleOffline
      );

      return () => {
        window.removeEventListener(
          "online",
          handleOnline
        );

        window.removeEventListener(
          "offline",
          handleOffline
        );
      };
    }, [
      loadOverview
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

      setNotificationsOpen(
        false
      );
    }, [
      location.pathname
    ]);

    /*
    |--------------------------------------------------------------------------
    | Lock Mobile Background Scrolling
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
      if (
        !sidebarOpen
      ) {
        return undefined;
      }

      const previousOverflow =
        document.body.style
          .overflow;

      document.body.style
        .overflow =
        "hidden";

      return () => {
        document.body.style
          .overflow =
          previousOverflow;
      };
    }, [
      sidebarOpen
    ]);

    /*
    |--------------------------------------------------------------------------
    | Outside Click and Escape Key
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
            notificationRef
              .current &&
            !notificationRef
              .current
              .contains(
                event.target
              )
          ) {
            setNotificationsOpen(
              false
            );
          }
        };

      const handleKeyDown =
        (
          event
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setSidebarOpen(
              false
            );

            setProfileOpen(
              false
            );

            setNotificationsOpen(
              false
            );
          }
        };

      document.addEventListener(
        "mousedown",
        handlePointerDown
      );

      document.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.removeEventListener(
          "mousedown",
          handlePointerDown
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    }, []);

    /*
    |--------------------------------------------------------------------------
    | Derived Portal Data
    |--------------------------------------------------------------------------
    */

    const student =
      overview?.student ||
      null;

    const school =
      student?.school ||
      (
        typeof user?.schoolId ===
          "object"
          ? user.schoolId
          : null
      ) ||
      null;

    const summary =
      overview?.summary ||
      {};

    const capabilities =
      overview?.capabilities ||
      {};

    const alerts =
      Array.isArray(
        overview?.alerts
      )
        ? overview.alerts
        : [];

    const today =
      overview?.today ||
      {};

    const unreadMessages =
      Number(
        summary?.messages
          ?.unreadMessages ||
        0
      );

    const profileCompletion =
      Number(
        summary
          ?.profileCompletion
          ?.percentage ||
        0
      );

    const attendanceRisk =
      summary?.attendance
        ?.risk?.level ||
      "unknown";

    const totalBalance =
      Number(
        summary?.fees
          ?.totalBalance ||
        0
      );

    const studentName =
      student?.name ||
      user?.name ||
      "Student";

    const studentPhoto =
      student?.photo ||
      user?.photo ||
      "";

    const studentInitials =
      getInitials(
        studentName
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

    const lastSyncLabel =
      useMemo(
        () => {
          void syncClock;

          return formatLastSync(
            lastSyncedAt
          );
        },
        [
          lastSyncedAt,
          syncClock
        ]
      );

    const isCapabilityAvailable =
      useCallback(
        (
          item
        ) => {
          if (
            !item.capability
          ) {
            return true;
          }

          const value =
            capabilities[
              item.capability
            ];

          if (
            value ===
            undefined
          ) {
            return Boolean(
              item.defaultAvailable
            );
          }

          /*
          | Academic progress page remains visible while detailed grades are
          | still unavailable because it also contains subjects and readiness.
          */

          if (
            item.path ===
            "/student-portal/academics"
          ) {
            return true;
          }

          return Boolean(
            value
          );
        },
        [
          capabilities
        ]
      );

    const getNavigationBadge =
      useCallback(
        (
          item
        ) => {
          if (
            item.badgeType ===
            "messages" &&
            unreadMessages >
              0
          ) {
            return {
              value:
                unreadMessages >
                99
                  ? "99+"
                  : String(
                      unreadMessages
                    ),

              tone:
                "rose"
            };
          }

          if (
            item.badgeType ===
              "fees" &&
            totalBalance >
              0
          ) {
            return {
              value:
                "Due",

              tone:
                "amber"
            };
          }

          if (
            item.badgeType ===
              "attendance" &&
            [
              "critical",
              "warning"
            ].includes(
              attendanceRisk
            )
          ) {
            return {
              value:
                "!",

              tone:
                attendanceRisk ===
                "critical"
                  ? "rose"
                  : "amber"
            };
          }

          if (
            item.badgeType ===
              "profile" &&
            profileCompletion >
              0 &&
            profileCompletion <
              80
          ) {
            return {
              value:
                "!",

              tone:
                "sky"
            };
          }

          return null;
        },
        [
          unreadMessages,
          totalBalance,
          attendanceRisk,
          profileCompletion
        ]
      );

    const portalContext =
      useMemo(
        () => ({
          overview,
          student,
          school,
          summary,
          capabilities,
          alerts,
          today,
          loading,
          refreshing,
          online,
          lastSyncedAt,

          refreshPortal:
            () =>
              loadOverview({
                silent:
                  true
              })
        }),
        [
          overview,
          student,
          school,
          summary,
          capabilities,
          alerts,
          today,
          loading,
          refreshing,
          online,
          lastSyncedAt,
          loadOverview
        ]
      );

    /*
    |--------------------------------------------------------------------------
    | Logout
    |--------------------------------------------------------------------------
    */

    const handleLogout =
      async () => {
        if (
          loggingOut
        ) {
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
              replace:
                true
            }
          );
        } catch (
          logoutError
        ) {
          console.error(
            "Student portal logout error:",
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
    | Navigation Item
    |--------------------------------------------------------------------------
    */

    const renderNavigationItem =
      (
        item
      ) => {
        const Icon =
          item.icon;

        const available =
          isCapabilityAvailable(
            item
          );

        const badge =
          getNavigationBadge(
            item
          );

        if (
          !available
        ) {
          return (
            <div
              key={
                item.path
              }
              className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 opacity-70"
              title="This module will be available in a future release."
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-slate-500">
                <Icon
                  size={17}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {item.label}
                </p>

                <p className="mt-0.5 truncate text-[10px] text-slate-600">
                  {item.description}
                </p>
              </div>

              <span className="rounded-full bg-white/[0.06] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">
                Soon
              </span>
            </div>
          );
        }

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

                {badge && (
                  <span
                    className={`flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      badge.tone ===
                      "rose"
                        ? "bg-rose-500 text-white"
                        : badge.tone ===
                            "amber"
                          ? "bg-amber-400 text-amber-950"
                          : "bg-sky-400 text-sky-950"
                    }`}
                  >
                    {badge.value}
                  </span>
                )}
              </>
            )}
          </NavLink>
        );
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
                    "/student-portal"
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
                    Student Experience
                  </p>
                </div>
              </button>
            </div>

            <div className="px-4 pt-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                <div className="flex items-center gap-3">
                  <PortalAvatar
                    src={
                      studentPhoto
                    }
                    name={
                      studentName
                    }
                    size="h-11 w-11"
                    className="ring-1 ring-white/15"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {studentName}
                    </p>

                    <p className="mt-0.5 truncate text-[11px] text-slate-300">
                      {formatClassName(
                        student
                      )}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] font-medium text-emerald-300">
                      {student
                        ?.admissionNumber ||
                        "Admission number pending"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-emerald-400/10 p-2 text-emerald-300 ring-1 ring-emerald-300/15">
                    <IdCard
                      size={16}
                    />
                  </div>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-5">
              <div className="space-y-1">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Student Menu
                </p>

                {primaryNavigation.map(
                  renderNavigationItem
                )}
              </div>

              <div className="mt-6 space-y-1 border-t border-white/10 pt-5">
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Learning Workspace
                </p>

                {futureNavigation.map(
                  renderNavigationItem
                )}
              </div>
            </nav>

            <div className="border-t border-white/10 p-4">
              <div className="rounded-2xl bg-gradient-to-br from-brand-500/20 to-cyan-400/10 p-4 ring-1 ring-white/10">
                <div className="flex items-center gap-2 text-emerald-200">
                  <ShieldCheck
                    size={16}
                  />

                  <p className="text-xs font-bold">
                    Private Student Access
                  </p>
                </div>

                <p className="mt-2 text-[11px] leading-5 text-slate-300">
                  This portal is securely linked to your student account. Only your own school record is available here.
                </p>

                <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                  {online ? (
                    <>
                      <Wifi
                        size={13}
                        className="text-emerald-300"
                      />

                      {lastSyncLabel}
                    </>
                  ) : (
                    <>
                      <WifiOff
                        size={13}
                        className="text-amber-300"
                      />

                      Offline mode
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      };

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/*
        |--------------------------------------------------------------------------
        | Desktop Sidebar
        |--------------------------------------------------------------------------
        */}

        <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-hidden bg-slate-950 shadow-2xl lg:block">
          {renderSidebar()}
        </aside>

        {/*
        |--------------------------------------------------------------------------
        | Mobile Sidebar
        |--------------------------------------------------------------------------
        */}

        {sidebarOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
              aria-label="Close student portal menu"
              onClick={() =>
                setSidebarOpen(
                  false
                )
              }
            />

            <aside className="relative h-full w-[88%] max-w-[330px] overflow-hidden bg-slate-950 shadow-2xl">
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

        {/*
        |--------------------------------------------------------------------------
        | Main Content
        |--------------------------------------------------------------------------
        */}

        <div className="min-h-screen lg:pl-72">
          {/*
          |--------------------------------------------------------------------------
          | Topbar
          |--------------------------------------------------------------------------
          */}

          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
            <div className="flex h-[72px] items-center gap-2 px-3 sm:gap-3 sm:px-6 xl:px-8">
              <button
                type="button"
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:hidden"
                onClick={() =>
                  setSidebarOpen(
                    true
                  )
                }
                aria-label="Open student portal menu"
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

              {/*
              |--------------------------------------------------------------------------
              | Connection Status
              |--------------------------------------------------------------------------
              */}

              <div
                className={`hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold xl:flex ${
                  online
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
                title={
                  lastSyncLabel
                }
              >
                {online ? (
                  <Wifi
                    size={15}
                  />
                ) : (
                  <WifiOff
                    size={15}
                  />
                )}

                <span>
                  {online
                    ? lastSyncLabel
                    : "Offline"}
                </span>
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Refresh
              |--------------------------------------------------------------------------
              */}

              <button
                type="button"
                className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"
                onClick={() =>
                  loadOverview({
                    silent:
                      true
                  })
                }
                disabled={
                  refreshing ||
                  !online
                }
                aria-label="Refresh student portal"
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

              {/*
              |--------------------------------------------------------------------------
              | Smart Alerts
              |--------------------------------------------------------------------------
              */}

              <div
                ref={
                  notificationRef
                }
                className="relative"
              >
                <button
                  type="button"
                  className={`relative rounded-xl p-2.5 transition ${
                    notificationsOpen
                      ? "bg-slate-100 text-brand-700"
                      : "text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                  }`}
                  onClick={() => {
                    setNotificationsOpen(
                      (
                        value
                      ) =>
                        !value
                    );

                    setProfileOpen(
                      false
                    );
                  }}
                  aria-label="Open smart alerts"
                  title="Smart alerts"
                >
                  <Bell
                    size={19}
                  />

                  {alerts.length >
                    0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-bold text-amber-950 ring-2 ring-white">
                      {alerts.length >
                      9
                        ? "9+"
                        : alerts.length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 top-[52px] z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          Smart Alerts
                        </p>

                        <p className="mt-0.5 text-xs text-slate-400">
                          Prioritised from your school record
                        </p>
                      </div>

                      <Sparkles
                        size={18}
                        className="text-brand-500"
                      />
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-3">
                      {alerts.length >
                      0 ? (
                        <div className="space-y-2">
                          {alerts.map(
                            (
                              alert,
                              index
                            ) => {
                              const tone =
                                getAlertTone(
                                  alert.type
                                );

                              return (
                                <button
                                  key={
                                    alert.id ||
                                    index
                                  }
                                  type="button"
                                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${tone.container}`}
                                  onClick={() => {
                                    setNotificationsOpen(
                                      false
                                    );

                                    if (
                                      alert.actionPath
                                    ) {
                                      navigate(
                                        alert.actionPath
                                      );
                                    }
                                  }}
                                >
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}
                                  >
                                    <Bell
                                      size={16}
                                    />
                                  </div>

                                  <div className="min-w-0">
                                    <p
                                      className={`text-xs font-bold ${tone.title}`}
                                    >
                                      {alert.title ||
                                        "Student alert"}
                                    </p>

                                    <p
                                      className={`mt-1 text-[11px] leading-5 ${tone.message}`}
                                    >
                                      {alert.message ||
                                        "Open this item for more information."}
                                    </p>
                                  </div>
                                </button>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        <div className="px-5 py-10 text-center">
                          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <ShieldCheck
                              size={22}
                            />
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-700">
                            Everything looks good
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            There are no important student alerts right now.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/*
              |--------------------------------------------------------------------------
              | Message Shortcut
              |--------------------------------------------------------------------------
              */}

              <button
                type="button"
                className="relative hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 xs:inline-flex sm:inline-flex"
                onClick={() =>
                  navigate(
                    "/student-portal/messages"
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

              {/*
              |--------------------------------------------------------------------------
              | Student Profile Menu
              |--------------------------------------------------------------------------
              */}

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

                    setNotificationsOpen(
                      false
                    );
                  }}
                  aria-expanded={
                    profileOpen
                  }
                >
                  <PortalAvatar
                    src={
                      studentPhoto
                    }
                    name={
                      studentName
                    }
                    size="h-9 w-9"
                    className="rounded-xl"
                  />

                  <div className="hidden max-w-36 text-left xl:block">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {studentName}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                      Student Account
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
                        <PortalAvatar
                          src={
                            studentPhoto
                          }
                          name={
                            studentName
                          }
                          size="h-12 w-12"
                          className="ring-1 ring-white/15"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">
                            {studentName}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-300">
                            {student
                              ?.admissionNumber ||
                              user?.email ||
                              "Verified student account"}
                          </p>

                          <p className="mt-1 truncate text-[10px] font-semibold text-emerald-300">
                            {formatClassName(
                              student
                            )}
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

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-800">
                            Secure Student Session
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-emerald-600">
                            {school
                              ?.schoolName ||
                              "Authenticated school access"}
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
                            "/student-portal/profile"
                          )
                        }
                      >
                        <CircleUserRound
                          size={17}
                        />

                        My Profile
                      </button>

                      <button
                        type="button"
                        className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        onClick={() =>
                          navigate(
                            "/student-portal/profile"
                          )
                        }
                      >
                        <IdCard
                          size={17}
                        />

                        Digital Student ID
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

            {/*
            |--------------------------------------------------------------------------
            | Mobile Student Status
            |--------------------------------------------------------------------------
            */}

            <div className="border-t border-slate-100 px-4 py-2 sm:hidden">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-700">
                    {formatClassName(
                      student
                    )}
                  </p>

                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    {student
                      ?.admissionNumber ||
                      "Student profile"}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold ${
                    online
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {online ? (
                    <Wifi
                      size={11}
                    />
                  ) : (
                    <WifiOff
                      size={11}
                    />
                  )}

                  {online
                    ? "Online"
                    : "Offline"}
                </div>
              </div>
            </div>
          </header>

          {/*
          |--------------------------------------------------------------------------
          | Portal Content
          |--------------------------------------------------------------------------
          */}

          <main className="px-4 py-5 pb-28 sm:px-6 sm:py-7 sm:pb-7 xl:px-8">
            {!online && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
                  <WifiOff
                    size={16}
                  />
                </div>

                <div>
                  <p className="text-sm font-bold text-amber-900">
                    You are currently offline
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-700">
                    Previously loaded information remains visible. New updates will sync automatically when your connection returns.
                  </p>
                </div>
              </div>
            )}

            {error &&
            overview && (
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-rose-800">
                    Student portal could not refresh
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
                    Preparing your student portal
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Loading profile, classes, attendance, fees and messages…
                  </p>
                </div>
              </div>
            ) : !overview &&
              error ? (
              <div className="grid min-h-[65vh] place-items-center">
                <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <WifiOff
                      size={24}
                    />
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-slate-900">
                    Student portal is unavailable
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {error}
                  </p>

                  <button
                    type="button"
                    className="btn-primary mt-5"
                    onClick={() =>
                      loadOverview()
                    }
                  >
                    <RefreshCw
                      size={16}
                    />

                    Try Again
                  </button>
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

          {/*
          |--------------------------------------------------------------------------
          | Footer
          |--------------------------------------------------------------------------
          */}

          <footer className="hidden border-t border-slate-200 bg-white px-4 py-4 sm:block sm:px-6 xl:px-8">
            <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={14}
                  className="text-brand-500"
                />

                <span>
                  Student Portal · Personalised learning access
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CalendarDays
                  size={14}
                />

                <span>
                  {online
                    ? `${lastSyncLabel} · Auto-refresh every minute`
                    : "Waiting for internet connection"}
                </span>
              </div>
            </div>
          </footer>
        </div>

        {/*
        |--------------------------------------------------------------------------
        | Mobile Bottom Navigation
        |--------------------------------------------------------------------------
        */}

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:hidden">
          <div className="grid grid-cols-5 gap-1">
            {mobileNavigation.map(
              (
                item
              ) => {
                const Icon =
                  item.icon;

                const badge =
                  item.badgeType ===
                    "messages" &&
                  unreadMessages >
                    0
                    ? unreadMessages
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
                    }) =>
                      `relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition ${
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-500 active:bg-slate-100"
                      }`
                    }
                  >
                    <div className="relative">
                      <Icon
                        size={19}
                      />

                      {badge >
                        0 && (
                        <span className="absolute -right-2.5 -top-2 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white ring-2 ring-white">
                          {badge >
                          9
                            ? "9+"
                            : badge}
                        </span>
                      )}
                    </div>

                    <span className="truncate">
                      {item.label}
                    </span>
                  </NavLink>
                );
              }
            )}

            <button
              type="button"
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold text-slate-500 transition active:bg-slate-100"
              onClick={() =>
                setSidebarOpen(
                  true
                )
              }
            >
              <MoreHorizontal
                size={19}
              />

              <span>
                More
              </span>
            </button>
          </div>
        </nav>
      </div>
    );
  };

export default StudentPortalLayout;
