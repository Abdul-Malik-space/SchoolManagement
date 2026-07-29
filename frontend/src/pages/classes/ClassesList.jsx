import { useEffect, useState } from "react";
import { Plus, GraduationCap, Pencil, Trash2, Search } from "lucide-react";
import { getClasses, deleteClass } from "../../api/classes";
import { getSchools } from "../../api/schools";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table, Td, EmptyState } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ClassFormModal } from "./ClassFormModal";

const ClassesList = () => {
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data } = await getClasses(schoolFilter ? { schoolId: schoolFilter } : {});
      setClasses(data?.classes || []);
    } catch (error) {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data } = await getSchools();
      setSchools(data?.schools || []);
    } catch (error) {
      setSchools([]);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolFilter]);

  const openCreate = () => {
    setEditingClass(null);
    setModalOpen(true);
  };

  const openEdit = (classItem) => {
    setEditingClass(classItem);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    fetchClasses();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClass(deleteTarget._id);
      setDeleteTarget(null);
      fetchClasses();
    } catch (error) {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = classes.filter((item) =>
    item.className.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Classes"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Class
          </button>
        }
      />

      <div className="card p-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="field-input pl-9"
              placeholder="Search classes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            className="field-select max-w-xs"
            value={schoolFilter}
            onChange={(event) => setSchoolFilter(event.target.value)}
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school._id} value={school._id}>
                {school.schoolName}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <Table columns={["Class", "School", "Sections", "Status", "Actions"]}>
            {filtered.length === 0 ? (
              <EmptyState
                colSpan={5}
                icon={GraduationCap}
                title="No classes found"
                description="Create the first class to get started"
              />
            ) : (
              filtered.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-800">{item.className}</Td>
                  <Td>{item.schoolId?.schoolName || "-"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {item.sections.map((section) => (
                        <Badge key={section._id || section.sectionName} tone="neutral">
                          {section.sectionName}
                        </Badge>
                      ))}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={item.isActive ? "success" : "danger"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        )}
      </div>

      <ClassFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        classData={editingClass}
        schools={schools}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Class"
        description={`Delete "${deleteTarget?.className}"? Classes with active students linked cannot be deleted.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default ClassesList;
