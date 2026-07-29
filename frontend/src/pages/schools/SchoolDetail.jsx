import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { getSchoolById } from "../../api/schools";
import { Badge } from "../../components/ui/Badge";
import { SchoolFormModal } from "./SchoolFormModal";

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-slate-50 py-3 last:border-0">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-800">{value || "-"}</span>
  </div>
);

const SchoolDetail = () => {
  const { id } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSchool = async () => {
    setLoading(true);
    try {
      const { data } = await getSchoolById(id);
      setSchool(data?.school || null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchool();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!school) {
    return <p className="text-sm text-slate-500">School not found.</p>;
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <Link to="/schools" className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Schools
        </Link>
        <button className="btn-secondary" onClick={() => setModalOpen(true)}>
          <Pencil size={15} /> Edit
        </button>
      </div>

      <div className="card max-w-xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-800">{school.schoolName}</h1>
          <Badge tone={school.isActive ? "success" : "danger"}>
            {school.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <InfoRow label="Type" value={school.type} />
        <InfoRow label="Session Year" value={school.sessionYear} />
        <InfoRow label="Address" value={school.address} />
        <InfoRow label="Phone" value={school.phone} />
        <InfoRow label="Email" value={school.email} />
      </div>

      <SchoolFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          fetchSchool();
        }}
        school={school}
      />
    </div>
  );
};

export default SchoolDetail;
