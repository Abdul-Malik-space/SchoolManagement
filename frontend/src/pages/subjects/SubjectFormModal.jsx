import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { createSubject, updateSubject } from "../../api/subjects";
import { getClasses } from "../../api/classes";
import { getTeachers } from "../../api/teachers";

const emptyForm = {
  schoolId: "",
  classId: "",
  teacherId: "",
  subjectCode: "",
  subjectName: "",
  description: ""
};

export const SubjectFormModal = ({ open, onClose, onSaved, subject, schools }) => {
  const [form, setForm] = useState(emptyForm);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(subject);

  useEffect(() => {
    if (!open) return;

    if (subject) {
      setForm({
        schoolId: subject.schoolId?._id || subject.schoolId || "",
        classId: subject.classId?._id || subject.classId || "",
        teacherId: subject.teacherId?._id || subject.teacherId || "",
        subjectCode: subject.subjectCode || "",
        subjectName: subject.subjectName || "",
        description: subject.description || ""
      });
    } else {
      setForm({ ...emptyForm, schoolId: schools?.[0]?._id || "" });
    }
    setError("");
  }, [subject, open, schools]);

  // Load classes and teachers whenever the selected school changes
  useEffect(() => {
    if (!form.schoolId) {
      setClasses([]);
      setTeachers([]);
      return;
    }

    const fetchDependents = async () => {
      try {
        const [classRes, teacherRes] = await Promise.all([
          getClasses({ schoolId: form.schoolId }),
          getTeachers({ schoolId: form.schoolId })
        ]);
        setClasses(classRes.data?.classes || []);
        setTeachers(teacherRes.data?.teachers || []);
      } catch (err) {
        setClasses([]);
        setTeachers([]);
      }
    };

    fetchDependents();
  }, [form.schoolId]);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSchoolChange = (event) => {
    setForm((prev) => ({ ...prev, schoolId: event.target.value, classId: "", teacherId: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = {
        ...form,
        teacherId: form.teacherId || null
      };

      if (isEdit) {
        await updateSubject(subject._id, payload);
      } else {
        await createSubject(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save the subject.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Subject" : "New Subject"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</div>
        )}

        <div>
          <label className="field-label">School</label>
          <select
            className="field-select"
            value={form.schoolId}
            onChange={handleSchoolChange}
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

        <div>
          <label className="field-label">Class</label>
          <select
            className="field-select"
            value={form.classId}
            onChange={handleChange("classId")}
            required
            disabled={isEdit || !form.schoolId}
          >
            <option value="" disabled>
              {form.schoolId ? "Select a class" : "Select a school first"}
            </option>
            {classes.map((classItem) => (
              <option key={classItem._id} value={classItem._id}>
                {classItem.className}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">Subject Code</label>
            <input
              required
              className="field-input"
              value={form.subjectCode}
              onChange={handleChange("subjectCode")}
              placeholder="MATH6"
            />
          </div>
          <div>
            <label className="field-label">Subject Name</label>
            <input
              required
              className="field-input"
              value={form.subjectName}
              onChange={handleChange("subjectName")}
              placeholder="Mathematics"
            />
          </div>
        </div>

        <div>
          <label className="field-label">Teacher (optional)</label>
          <select
            className="field-select"
            value={form.teacherId}
            onChange={handleChange("teacherId")}
            disabled={!form.schoolId}
          >
            <option value="">Not assigned yet</option>
            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Description (optional)</label>
          <textarea
            className="field-input"
            rows={3}
            value={form.description}
            onChange={handleChange("description")}
            placeholder="Short note about this subject"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Subject"}
          </button>
        </div>
      </form>
    </Modal>
  );
};