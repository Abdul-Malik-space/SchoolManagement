import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { createSchool, updateSchool } from "../../api/schools";

const emptyForm = {
  schoolName: "",
  type: "school",
  address: "",
  phone: "",
  email: "",
  sessionYear: ""
};

export const SchoolFormModal = ({ open, onClose, onSaved, school }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(school);

  useEffect(() => {
    if (school) {
      setForm({
        schoolName: school.schoolName || "",
        type: school.type || "school",
        address: school.address || "",
        phone: school.phone || "",
        email: school.email || "",
        sessionYear: school.sessionYear || ""
      });
    } else {
      setForm(emptyForm);
    }
    setError("");
  }, [school, open]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      if (isEdit) {
        await updateSchool(school._id, form);
      } else {
        await createSchool(form);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the school.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit School" : "New School"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</div>
        )}

        <div>
          <label className="field-label">School Name</label>
          <input
            required
            className="field-input"
            value={form.schoolName}
            onChange={handleChange("schoolName")}
            placeholder="Greenfield School"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Type</label>
            <select className="field-select" value={form.type} onChange={handleChange("type")}>
              <option value="school">School</option>
              <option value="madrasa">Madrasa</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className="field-label">Session Year</label>
            <input
              required
              className="field-input"
              value={form.sessionYear}
              onChange={handleChange("sessionYear")}
              placeholder="2025-2026"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Address</label>
          <input
            required
            className="field-input"
            value={form.address}
            onChange={handleChange("address")}
            placeholder="Street, City"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Phone</label>
            <input
              required
              className="field-input"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="03xx-xxxxxxx"
            />
          </div>
          <div>
            <label className="field-label">Email</label>
            <input
              type="email"
              className="field-input"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create School"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
