import {
  useEffect,
  useState
} from "react";
import {
  BookOpen,
  Pencil,
  Plus,
  Search,
  Trash2
} from "lucide-react";

import {
  deleteSubject,
  getSubjects
} from "../../api/subjects";
import {
  getSchools
} from "../../api/schools";
import {
  getClasses
} from "../../api/classes";
import {
  useAuth
} from "../../context/AuthContext";
import {
  PageHeader
} from "../../components/ui/PageHeader";
import {
  Table,
  Td,
  EmptyState
} from "../../components/ui/Table";
import {
  Badge
} from "../../components/ui/Badge";
import {
  ConfirmDialog
} from "../../components/ui/ConfirmDialog";
import {
  SubjectFormModal
} from "./SubjectFormModal";

const SubjectsList = () => {
  const {
    user
  } = useAuth();

  const role =
    String(
      user?.role ||
      ""
    ).toLowerCase();

  const isSuperAdmin =
    role ===
    "super_admin";

  const [
    subjects,
    setSubjects
  ] = useState([]);

  const [
    schools,
    setSchools
  ] = useState([]);

  const [
    classes,
    setClasses
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    search,
    setSearch
  ] = useState("");

  const [
    schoolFilter,
    setSchoolFilter
  ] = useState("");

  const [
    classFilter,
    setClassFilter
  ] = useState("");

  const [
    modalOpen,
    setModalOpen
  ] = useState(false);

  const [
    editingSubject,
    setEditingSubject
  ] = useState(null);

  const [
    deleteTarget,
    setDeleteTarget
  ] = useState(null);

  const [
    deleting,
    setDeleting
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Subject Scope
  |--------------------------------------------------------------------------
  |
  | Super Admin:
  | - Can optionally send schoolId and view/filter subjects across schools.
  |
  | Principal / school-scoped roles:
  | - Never send a client-controlled schoolId.
  | - Backend resolves the school from the authenticated account.
  |
  */

  const fetchSubjects =
    async () => {
      setLoading(
        true
      );

      try {
        const params =
          {};

        if (
          isSuperAdmin &&
          schoolFilter
        ) {
          params.schoolId =
            schoolFilter;
        }

        if (
          classFilter
        ) {
          params.classId =
            classFilter;
        }

        const {
          data
        } =
          await getSubjects(
            params
          );

        setSubjects(
          data?.subjects ||
          []
        );
      } catch (
        error
      ) {
        setSubjects([]);
      } finally {
        setLoading(
          false
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Schools
  |--------------------------------------------------------------------------
  |
  | Only Super Admin needs the school directory on this screen.
  | A Principal must not receive or see an "All Schools" selector.
  |
  */

  const fetchSchools =
    async () => {
      if (
        !isSuperAdmin
      ) {
        setSchools([]);
        return;
      }

      try {
        const {
          data
        } =
          await getSchools();

        setSchools(
          data?.schools ||
          []
        );
      } catch (
        error
      ) {
        setSchools([]);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Classes
  |--------------------------------------------------------------------------
  |
  | Principal:
  | getClasses({}) remains school-scoped by the backend.
  |
  | Super Admin:
  | selected schoolId is passed only when a school filter is selected.
  |
  */

  const fetchClassesForFilter =
    async () => {
      try {
        const params =
          isSuperAdmin &&
          schoolFilter
            ? {
                schoolId:
                  schoolFilter
              }
            : {};

        const {
          data
        } =
          await getClasses(
            params
          );

        setClasses(
          data?.classes ||
          []
        );
      } catch (
        error
      ) {
        setClasses([]);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Role Change Safety
  |--------------------------------------------------------------------------
  |
  | If the authenticated role changes without a full reload, any previous
  | Super Admin school filter is cleared before school-scoped requests run.
  |
  */

  useEffect(
    () => {
      if (
        !isSuperAdmin
      ) {
        setSchoolFilter(
          ""
        );

        setSchools([]);
      }
    },
    [
      isSuperAdmin
    ]
  );

  useEffect(
    () => {
      fetchSchools();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      isSuperAdmin
    ]
  );

  useEffect(
    () => {
      fetchClassesForFilter();

      setClassFilter(
        ""
      );

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      isSuperAdmin,
      schoolFilter
    ]
  );

  useEffect(
    () => {
      fetchSubjects();

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      isSuperAdmin,
      schoolFilter,
      classFilter
    ]
  );

  const openCreate =
    () => {
      setEditingSubject(
        null
      );

      setModalOpen(
        true
      );
    };

  const openEdit =
    (
      subject
    ) => {
      setEditingSubject(
        subject
      );

      setModalOpen(
        true
      );
    };

  const handleSaved =
    () => {
      setModalOpen(
        false
      );

      fetchSubjects();
    };

  const handleDelete =
    async () => {
      if (
        !deleteTarget
      ) {
        return;
      }

      setDeleting(
        true
      );

      try {
        await deleteSubject(
          deleteTarget._id
        );

        setDeleteTarget(
          null
        );

        fetchSubjects();
      } catch (
        error
      ) {
        setDeleteTarget(
          null
        );
      } finally {
        setDeleting(
          false
        );
      }
    };

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const filtered =
    subjects.filter(
      (
        item
      ) => {
        if (
          !normalizedSearch
        ) {
          return true;
        }

        const subjectName =
          String(
            item?.subjectName ||
            ""
          ).toLowerCase();

        const subjectCode =
          String(
            item?.subjectCode ||
            ""
          ).toLowerCase();

        return (
          subjectName.includes(
            normalizedSearch
          ) ||
          subjectCode.includes(
            normalizedSearch
          )
        );
      }
    );

  return (
    <div>
      <PageHeader
        title="Subjects"
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={
              openCreate
            }
          >
            <Plus
              size={16}
            />

            New Subject
          </button>
        }
      />

      <div className="card p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              className="field-input pl-9"
              placeholder="Search subjects"
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
            />
          </div>

          {/*
          |--------------------------------------------------------------------------
          | School Filter
          |--------------------------------------------------------------------------
          |
          | This selector is intentionally Super Admin only.
          | Principal sees subjects from the assigned school automatically.
          |
          */}

          {isSuperAdmin && (
            <select
              className="field-select max-w-xs"
              value={
                schoolFilter
              }
              onChange={(
                event
              ) =>
                setSchoolFilter(
                  event.target.value
                )
              }
              aria-label="Filter subjects by school"
            >
              <option value="">
                All Schools
              </option>

              {schools.map(
                (
                  school
                ) => (
                  <option
                    key={
                      school._id
                    }
                    value={
                      school._id
                    }
                  >
                    {school.schoolName}
                  </option>
                )
              )}
            </select>
          )}

          <select
            className="field-select max-w-xs"
            value={
              classFilter
            }
            onChange={(
              event
            ) =>
              setClassFilter(
                event.target.value
              )
            }
            disabled={
              !classes.length
            }
            aria-label="Filter subjects by class"
          >
            <option value="">
              All Classes
            </option>

            {classes.map(
              (
                classItem
              ) => (
                <option
                  key={
                    classItem._id
                  }
                  value={
                    classItem._id
                  }
                >
                  {classItem.className}
                </option>
              )
            )}
          </select>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <Table
            columns={[
              "Subject",
              "Code",
              "Class",
              "Teacher",
              "Status",
              "Actions"
            ]}
          >
            {filtered.length ===
            0 ? (
              <EmptyState
                colSpan={6}
                icon={
                  BookOpen
                }
                title="No subjects found"
                description="Create the first subject to get started"
              />
            ) : (
              filtered.map(
                (
                  item
                ) => (
                  <tr
                    key={
                      item._id
                    }
                    className="hover:bg-slate-50/60"
                  >
                    <Td className="font-medium text-slate-800">
                      {item.subjectName}
                    </Td>

                    <Td>
                      <Badge tone="info">
                        {item.subjectCode}
                      </Badge>
                    </Td>

                    <Td>
                      {item.classId
                        ?.className ||
                        "-"}
                    </Td>

                    <Td>
                      {item.teacherId
                        ?.name ||
                        "Not assigned"}
                    </Td>

                    <Td>
                      <Badge
                        tone={
                          item.isActive
                            ? "success"
                            : "danger"
                        }
                      >
                        {item.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </Td>

                    <Td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(
                              item
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Edit ${item.subjectName}`}
                          title="Edit subject"
                        >
                          <Pencil
                            size={15}
                          />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(
                              item
                            )
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${item.subjectName}`}
                          title="Delete subject"
                        >
                          <Trash2
                            size={15}
                          />
                        </button>
                      </div>
                    </Td>
                  </tr>
                )
              )
            )}
          </Table>
        )}
      </div>

      <SubjectFormModal
        open={
          modalOpen
        }
        onClose={() =>
          setModalOpen(
            false
          )
        }
        onSaved={
          handleSaved
        }
        subject={
          editingSubject
        }
        schools={
          isSuperAdmin
            ? schools
            : []
        }
      />

      <ConfirmDialog
        open={
          Boolean(
            deleteTarget
          )
        }
        onClose={() =>
          setDeleteTarget(
            null
          )
        }
        onConfirm={
          handleDelete
        }
        title="Delete Subject"
        description={`Delete "${deleteTarget?.subjectName}"?`}
        confirmLabel="Delete"
        loading={
          deleting
        }
      />
    </div>
  );
};

export default SubjectsList;
