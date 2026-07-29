import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { createClass, updateClass } from "../../api/classes";

const emptySection = () => ({ sectionName: "", capacity: 40 });

export const ClassFormModal = ({ open, onClose, onSaved, classData, schools }) => {
  const [form, setForm] = useState({ schoolId: "", className: "", numericOrder: 0 });
  const [sections, setSections] = useState([emptySection()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(classData);

  useEffect(() => {
    if (classData) {
      setForm({
        schoolId: classData.schoolId?._id || classData.schoolId || "",
        className: classData.className || "",
        numericOrder: classData.numericOrder ?? 0
      });
      setSections(
        classData.sections?.length
          ? classData.sections.map((section) => ({
              _id: section._id,
              sectionName: section.sectionName,
              capacity: section.capacity ?? 40
            }))
          : [emptySection()]
      );
    } else {
      setForm({ schoolId: schools?.[0]?._id || "", className: "", numericOrder: 0 });
      setSections([emptySection()]);
    }
    setError("");
  }, [classData, open, schools]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSectionChange = (index, field) => (event) => {
    const value = field === "capacity" ? Number(event.target.value) : event.target.value;
    setSections((prev) =>
      prev.map((section, i) => (i === index ? { ...section, [field]: value } : section))
    );
  };

  const addSection = () => setSections((prev) => [...prev, emptySection()]);

  const removeSection = (index) =>
    setSections((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const cleanedSections = sections.filter((section) => section.sectionName.trim());

    if (cleanedSections.length === 0) {
      setError("Add at least one section.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, sections: cleanedSections };

      if (isEdit) {
        await updateClass(classData._id, payload);
      } else {
        await createClass(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the class.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Class" : "New Class"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</div>
        )}

        <div>
          <label className="field-label">School</label>
          <select
            className="field-select"
            value={form.schoolId}
            onChange={handleChange("schoolId")}
            required
            disabled={isEdit}
          >
            <option value="" disabled>
              Select a school
            </option>
            {schools?.map((school) => (
              <option key={school._id} value={school._id}>
                {school.schoolName}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Class Name</label>
            <input
              required
              className="field-input"
              value={form.className}
              onChange={handleChange("className")}
              placeholder="Class 6"
            />
          </div>
          <div>
            <label className="field-label">Order</label>
            <input
              type="number"
              className="field-input"
              value={form.numericOrder}
              onChange={handleChange("numericOrder")}
              placeholder="1"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="field-label mb-0">Sections</label>
            <button type="button" onClick={addSection} className="btn-ghost !px-2 !py-1 text-xs">
              <Plus size={13} /> Add Section
            </button>
          </div>

          <div className="space-y-2">
            {sections.map((section, index) => (
              <div key={section._id || index} className="flex items-center gap-2">
                <input
                  className="field-input"
                  placeholder="Section name, e.g. A"
                  value={section.sectionName}
                  onChange={handleSectionChange(index, "sectionName")}
                />
                <input
                  type="number"
                  className="field-input w-24"
                  placeholder="Capacity"
                  value={section.capacity}
                  onChange={handleSectionChange(index, "capacity")}
                />
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Class"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
