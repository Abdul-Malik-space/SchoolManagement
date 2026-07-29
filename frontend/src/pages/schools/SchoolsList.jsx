import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, School, Search, Eye, Pencil } from "lucide-react";
import { getSchools, updateSchool } from "../../api/schools";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table, Td, EmptyState } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { SchoolFormModal } from "./SchoolFormModal";

const SchoolsList = () => {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const { data } = await getSchools();
      setSchools(data?.schools || []);
    } catch (error) {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const openCreate = () => {
    setEditingSchool(null);
    setModalOpen(true);
  };

  const openEdit = (school) => {
    setEditingSchool(school);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    fetchSchools();
  };

  const toggleActive = async (school) => {
    await updateSchool(school._id, { isActive: !school.isActive });
    fetchSchools();
  };

  const filtered = schools.filter((school) =>
    school.schoolName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Schools"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New School
          </button>
        }
      />

      <div className="card p-4">
        <div className="relative mb-4 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="field-input pl-9"
            placeholder="Search schools"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <Table columns={["School", "Type", "Session", "Status", "Actions"]}>
            {filtered.length === 0 ? (
              <EmptyState
                colSpan={5}
                icon={School}
                title="No schools found"
                description="Create the first school to get started"
              />
            ) : (
              filtered.map((school) => (
                <tr key={school._id} className="hover:bg-slate-50/60">
                  <Td className="font-medium text-slate-800">{school.schoolName}</Td>
                  <Td className="capitalize">{school.type}</Td>
                  <Td>{school.sessionYear}</Td>
                  <Td>
                    <button onClick={() => toggleActive(school)}>
                      <Badge tone={school.isActive ? "success" : "danger"}>
                        {school.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/schools/${school._id}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        onClick={() => openEdit(school)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </Table>
        )}
      </div>

      <SchoolFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        school={editingSchool}
      />
    </div>
  );
};

export default SchoolsList;
