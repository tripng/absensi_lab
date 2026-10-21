import { useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import Navbar from '../Absensi/Navbar';
import Topbar from '../Absensi/Topbar';
import Mso from '../Absensi/Mso';
import Modal from '@/Components/Modal';

const statusOptions = [
  { value: 'active', label: 'Aktif' },
  { value: 'promoted', label: 'Naik Kelas' },
  { value: 'retained', label: 'Tinggal Kelas' },
  { value: 'graduated', label: 'Lulus' },
  { value: 'transferred', label: 'Pindah' },
  { value: 'dropped', label: 'Keluar' },
];

const statusBadge = {
  active: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  promoted: 'bg-primary-fixed text-on-primary-fixed',
  retained: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  graduated: 'bg-primary text-on-primary',
  transferred: 'bg-surface-container-high text-on-surface-variant',
  dropped: 'bg-error-container text-on-error-container',
};

const statusLabel = (value) =>
  statusOptions.find((option) => option.value === value)?.label ?? value;

export default function StudentEnrollmentsIndex({
  enrollments = [],
  academicYears = [],
  students = [],
  classes = [],
}) {
  const [filterStudent, setFilterStudent] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const success = usePage().props.success;

  const filtered = filterStudent
    ? enrollments.filter((row) => String(row.student_id) === String(filterStudent))
    : enrollments;

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setShowModal(true);
  };

  const closeForm = () => {
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="w-full px-space-md sm:px-space-lg lg:px-space-lg py-space-lg">
            <div className="mb-space-lg">
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                Riwayat Enrollment Siswa
              </h1>
              <p className="mt-space-xs font-body-md text-body-md text-on-surface-variant">
                Kelola riwayat penempatan kelas siswa untuk setiap tahun ajaran.
              </p>
            </div>

            <div className="mb-space-md flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={openCreate}
                className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs shadow"
              >
                <Mso name="add" /> Tambah Enrollment
              </button>

              <div className="flex items-center gap-space-sm">
                <label htmlFor="filter-student" className="font-label-sm text-on-surface-variant whitespace-nowrap">
                  Filter Siswa
                </label>
                <select
                  id="filter-student"
                  name="filter_student"
                  value={filterStudent}
                  onChange={(event) => setFilterStudent(event.target.value)}
                  className="min-w-60 px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Semua siswa</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.nama}{student.nisn ? ` — ${student.nisn}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {success && (
              <div
                role="status"
                className="mb-space-md flex items-center gap-space-xs px-space-md py-space-sm bg-tertiary-fixed text-on-tertiary-fixed-variant border border-tertiary/20 rounded-xl font-body-md"
              >
                <Mso name="check_circle" size={18} />
                <span>{success}</span>
              </div>
            )}

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              {filtered.length === 0 ? (
                <div className="py-space-xl text-center text-on-surface-variant">
                  <Mso name="history" size={40} className="mx-auto mb-space-sm text-outline" />
                  <p className="font-body-md">
                    {filterStudent ? 'Siswa ini belum memiliki riwayat enrollment.' : 'Belum ada riwayat enrollment.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-md">
                    <thead className="bg-surface-container-high text-on-surface-variant">
                      <tr>
                        <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider">Siswa</th>
                        <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider">NISN</th>
                        <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider">Kelas</th>
                        <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider">Tahun Ajaran</th>
                        <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider">Status</th>
                        <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider">Dibuat</th>
                        <th className="px-space-md py-space-sm font-label-sm text-label-sm uppercase tracking-wider text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {filtered.map((row) => (
                        <tr key={row.id} className="hover:bg-surface-container transition-colors">
                          <td className="px-space-md py-space-sm text-on-surface font-medium">{row.student_nama}</td>
                          <td className="px-space-md py-space-sm text-on-surface-variant">{row.nisn ?? '-'}</td>
                          <td className="px-space-md py-space-sm text-on-surface">{row.class_nama}</td>
                          <td className="px-space-md py-space-sm text-on-surface">{row.academic_year_name}</td>
                          <td className="px-space-md py-space-sm">
                            <span className={`inline-flex px-space-sm py-0.5 rounded-full font-label-sm ${statusBadge[row.status] ?? 'bg-surface-container-high text-on-surface-variant'}`}>
                              {statusLabel(row.status)}
                            </span>
                          </td>
                          <td className="px-space-md py-space-sm text-on-surface-variant">{row.created_at ?? '-'}</td>
                          <td className="px-space-md py-space-sm text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Mso name="edit" size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Hapus enrollment ini?')) {
                                  router.delete(`/student-enrollments/${row.id}`, {
                                    preserveScroll: true,
                                    onError: (errors) => {
                                      const message = Object.values(errors ?? {}).join('\n');
                                      alert(message || 'Gagal menghapus enrollment.');
                                    },
                                  });
                                }
                              }}
                              className="p-space-xs text-on-surface-variant hover:text-error hover:bg-error-container/10 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Mso name="delete" size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <Modal show={showModal} maxWidth="lg" onClose={closeForm}>
        <div className="p-space-lg bg-surface-container-lowest">
          <div className="flex items-center justify-between mb-space-md">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              {editing ? 'Edit Enrollment' : 'Tambah Enrollment'}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="p-space-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-lg transition-colors"
            >
              <Mso name="close" />
            </button>
          </div>

          <StudentEnrollmentForm
            key={editing ? `edit-${editing.id}` : 'new'}
            editing={editing}
            students={students}
            classes={classes}
            academicYears={academicYears}
            onSuccess={closeForm}
          />
        </div>
      </Modal>
    </div>
  );
}

function StudentEnrollmentForm({ editing, students, classes, academicYears, onSuccess }) {
  const form = useForm({
    student_id: editing?.student_id ?? '',
    class_id: editing?.class_id ?? '',
    academic_year_id: editing?.academic_year_id ?? '',
    status: editing?.status ?? 'active',
  });

  const submit = (event) => {
    event.preventDefault();

    if (editing) {
      form.put(`/student-enrollments/${editing.id}`, {
        preserveScroll: true,
        onSuccess,
      });
    } else {
      form.post('/student-enrollments', {
        preserveScroll: true,
        onSuccess,
      });
    }
  };

  const fieldError = (field) => (
    form.errors?.[field] ? (
      <span className="font-label-sm text-error mt-space-xs">{form.errors[field]}</span>
    ) : null
  );

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
      <div className="flex flex-col gap-space-xs md:col-span-2">
        <label htmlFor="student_id" className="font-label-sm text-on-surface-variant block">
          Siswa *
        </label>
        <select
          id="student_id"
          name="student_id"
          value={form.data.student_id}
          onChange={(event) => form.setData('student_id', event.target.value)}
          className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">- pilih siswa -</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.nama}{student.nisn ? ` — ${student.nisn}` : ''}
            </option>
          ))}
        </select>
        {fieldError('student_id')}
      </div>

      <div className="flex flex-col gap-space-xs">
        <label htmlFor="class_id" className="font-label-sm text-on-surface-variant block">
          Kelas *
        </label>
        <select
          id="class_id"
          name="class_id"
          value={form.data.class_id}
          onChange={(event) => form.setData('class_id', event.target.value)}
          className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">- pilih kelas -</option>
          {classes.map((kelas) => (
            <option key={kelas.id} value={kelas.id}>
              {kelas.nama_kelas}{kelas.tahun_ajaran ? ` (${kelas.tahun_ajaran})` : ''}
            </option>
          ))}
        </select>
        {fieldError('class_id')}
      </div>

      <div className="flex flex-col gap-space-xs">
        <label htmlFor="academic_year_id" className="font-label-sm text-on-surface-variant block">
          Tahun Ajaran *
        </label>
        <select
          id="academic_year_id"
          name="academic_year_id"
          value={form.data.academic_year_id}
          onChange={(event) => form.setData('academic_year_id', event.target.value)}
          className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">- pilih tahun ajaran -</option>
          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}{year.is_active ? ' (aktif)' : ''}
            </option>
          ))}
        </select>
        {fieldError('academic_year_id')}
      </div>

      <div className="flex flex-col gap-space-xs md:col-span-2">
        <label htmlFor="status" className="font-label-sm text-on-surface-variant block">
          Status *
        </label>
        <select
          id="status"
          name="status"
          value={form.data.status}
          onChange={(event) => form.setData('status', event.target.value)}
          className="w-full px-space-sm py-space-xs border border-outline-variant rounded-xl bg-surface-container-high text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {fieldError('status')}
      </div>

      <div className="md:col-span-2 flex justify-end gap-space-sm mt-space-md pt-space-md border-t border-outline-variant">
        <button
          type="button"
          onClick={onSuccess}
          className="px-space-md py-space-sm bg-surface-container-high text-on-surface-variant rounded-xl font-label-md font-medium hover:bg-surface-container transition-colors"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={form.processing}
          className="px-space-md py-space-sm bg-primary text-on-primary rounded-xl font-label-md font-medium hover:bg-primary/90 transition-colors flex items-center gap-space-xs shadow disabled:opacity-60"
        >
          <Mso name="save" /> Simpan
        </button>
      </div>
    </form>
  );
}
