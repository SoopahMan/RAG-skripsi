import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Upload,
    FileText,
    Trash2,
    Loader2,
    CheckCircle,
    UserPlus,
    Pencil,
    Users
} from "lucide-react";

import axios from "axios";

const API = "http://localhost:8000";

export default function DocumentPage() {

    const navigate = useNavigate();

    const [documents, setDocuments] = useState([]);

    const [showModal, setShowModal] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);

    const [uploading, setUploading] = useState(false);

    const [progress, setProgress] = useState(0);

    const [statusText, setStatusText] = useState("");

    const [taskId, setTaskId] = useState("");

    const [users, setUsers] = useState([]);

    const [showUserModal, setShowUserModal] = useState(false);

    const [editingUser, setEditingUser] = useState(null);

    const [userForm, setUserForm] = useState({
        username: "",
        password: "",
        role: "user"
    });



    async function loadDocuments() {

        try {

            const res = await axios.get(
                `${API}/documents`
            );

            setDocuments(res.data);

        } catch (e) {

            console.log(e);

        }

    }



    useEffect(() => {

        loadDocuments();
        loadUsers();

    }, []);

    const authConfig = () => ({
        headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`
        }
    });

    async function loadUsers() {
        try {
            const res = await axios.get(`${API}/users`, authConfig());
            setUsers(res.data);
        } catch (e) {
            alert(e.response?.data?.detail || "Gagal memuat data user");
        }
    }

    function openUserModal(user = null) {
        setEditingUser(user);
        setUserForm({
            username: user?.username || "",
            password: "",
            role: user?.role || "user"
        });
        setShowUserModal(true);
    }

    async function saveUser(e) {
        e.preventDefault();
        if (!userForm.username.trim() || (!editingUser && !userForm.password)) {
            alert("Username dan password wajib diisi untuk user baru");
            return;
        }

        try {
            const payload = {
                username: userForm.username.trim(),
                role: userForm.role
            };
            if (userForm.password) payload.password = userForm.password;

            if (editingUser) {
                await axios.put(`${API}/users/${editingUser.id}`, payload, authConfig());
            } else {
                await axios.post(`${API}/users`, payload, authConfig());
            }

            setShowUserModal(false);
            await loadUsers();
        } catch (e) {
            alert(e.response?.data?.detail || "Gagal menyimpan user");
        }
    }

    async function deleteUser(userId) {
        if (!window.confirm("Hapus user ini?")) return;

        try {
            await axios.delete(`${API}/users/${userId}`, authConfig());
            await loadUsers();
        } catch (e) {
            alert(e.response?.data?.detail || "Gagal menghapus user");
        }
    }



    async function handleUpload() {

        if (!selectedFile) return;

        const formData = new FormData();

        formData.append(
            "file",
            selectedFile
        );

        try {

            setUploading(true);

            const res = await axios.post(

                `${API}/upload`,

                formData,

                {

                    headers: {

                        "Content-Type": "multipart/form-data"

                    }

                }

            );

            setTaskId(
                res.data.task_id
            );

        } catch (e) {

            alert("Upload gagal");

            setUploading(false);

        }

    }



    useEffect(() => {

        if (!taskId) return;

        const interval = setInterval(async () => {

            try {

                const res = await axios.get(

                    `${API}/upload-status/${taskId}`

                );

                setProgress(
                    res.data.progress
                );

                setStatusText(
                    res.data.message
                );

                if (res.data.finished) {
                    clearInterval(interval);
                    setTimeout(async () => {
                        await loadDocuments();
                        setUploading(false);
                        setShowModal(false);
                        setSelectedFile(null);
                        setProgress(0);
                        setTaskId("");
                    }, 500);
                }

                if (res.data.error) {
                    clearInterval(interval);
                    alert(res.data.error);
                    setUploading(false);
                }

            }

            catch (e) {

                console.log(e);

            }

        }, 1000);

        return () => clearInterval(interval);

    }, [taskId]);



    async function deleteDocument(documentId) {

        if (!window.confirm("Hapus dokumen ini?"))

            return;

        try {

            await axios.delete(

                `${API}/documents/${documentId}`

            );

            loadDocuments();

        }

        catch (e) {

            alert("Gagal menghapus");

        }

    }



    return (

        <div className="min-h-screen bg-slate-50">

            <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-b-3xl shadow-lg">

                <div className="max-w-6xl mx-auto flex justify-between items-center p-5">

                    <div className="flex items-center gap-3">

                        <button

                            onClick={() => navigate(-1)}

                            className="p-2 rounded-xl bg-white/20 hover:bg-white/30"

                        >

                            <ArrowLeft size={20} />

                        </button>

                        <div>

                            <h1 className="text-xl font-black">

                                Knowledge Base

                            </h1>

                            <p className="text-sm opacity-80">

                                Kelola Modul Ajar EduBot

                            </p>

                        </div>

                    </div>

                    <button

                        onClick={() => setShowModal(true)}

                        className="bg-white text-blue-600 font-bold px-5 py-3 rounded-xl hover:scale-105 transition flex items-center gap-2"

                    >
                        <Upload size={18} />
                        Upload PDF
                    </button>
                </div>
            </header>
            <div className="max-w-6xl mx-auto mt-8">
                <div className="bg-white rounded-3xl shadow">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="p-4 text-left">
                                    File
                                </th>
                                <th>
                                    Halaman
                                </th>
                                <th>
                                    Chunk
                                </th>
                                <th>
                                    Status
                                </th>
                                <th>
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                documents.map(doc => (
                                    <tr

                                        key={doc.document_id}

                                        className="border-b hover:bg-slate-50"

                                    >

                                        <td className="p-4 flex items-center gap-3">

                                            <FileText

                                                className="text-blue-600"

                                            />

                                            {doc.filename}

                                        </td>

                                        <td align="center">

                                            {doc.total_pages}

                                        </td>

                                        <td align="center">

                                            {doc.total_chunks}

                                        </td>

                                        <td align="center">

                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

                                                {doc.status}

                                            </span>

                                        </td>

                                        <td align="center">

                                            <button

                                                onClick={() => deleteDocument(doc.document_id)}

                                                className="text-red-500 hover:text-red-700"

                                            >

                                                <Trash2 size={20} />

                                            </button>

                                        </td>

                                    </tr>

                                ))

                            }
                        </tbody>
                    </table>
                </div>

                <div className="bg-white rounded-3xl shadow mt-8 mb-10 overflow-hidden">
                    <div className="p-5 border-b flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                                <Users size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Manajemen User</h2>
                                <p className="text-sm text-slate-500">Kelola akun admin, guru, dan siswa</p>
                            </div>
                        </div>
                        <button
                            onClick={() => openUserModal()}
                            className="bg-blue-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <UserPlus size={18} />
                            Tambah User
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px]">
                            <thead>
                                <tr className="border-b bg-slate-50 text-slate-500 text-sm">
                                    <th className="p-4 text-left">Username</th>
                                    <th className="text-left">Role</th>
                                    <th className="text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-4 font-semibold text-slate-700">{user.username}</td>
                                        <td>
                                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex justify-center gap-3">
                                                <button
                                                    onClick={() => openUserModal(user)}
                                                    title="Edit user"
                                                    className="text-blue-500 hover:text-blue-700"
                                                >
                                                    <Pencil size={19} />
                                                </button>
                                                <button
                                                    onClick={() => deleteUser(user.id)}
                                                    title="Hapus user"
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={19} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!users.length && (
                                    <tr>
                                        <td colSpan="3" className="p-6 text-center text-slate-500">
                                            Belum ada data user.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showUserModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <form onSubmit={saveUser} className="bg-white rounded-3xl w-full max-w-[520px] p-8 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-6">
                            {editingUser ? "Edit User" : "Tambah User"}
                        </h2>

                        <div className="space-y-4">
                            <label className="block">
                                <span className="block text-sm font-bold text-slate-600 mb-2">Username</span>
                                <input
                                    type="text"
                                    value={userForm.username}
                                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                                    required
                                />
                            </label>

                            <label className="block">
                                <span className="block text-sm font-bold text-slate-600 mb-2">
                                    Password {editingUser && <span className="font-normal text-slate-400">(kosongkan jika tidak diubah)</span>}
                                </span>
                                <input
                                    type="password"
                                    value={userForm.password}
                                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                                    required={!editingUser}
                                />
                            </label>

                            <label className="block">
                                <span className="block text-sm font-bold text-slate-600 mb-2">Role</span>
                                <select
                                    value={userForm.role}
                                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500"
                                >
                                    <option value="user">User / Siswa</option>
                                    <option value="admin">Admin/Teacher</option>
                                </select>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => setShowUserModal(false)}
                                className="px-5 py-2 rounded-xl border"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </div>
            )}

                        {
                showModal && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white rounded-3xl w-[520px] p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold mb-6">
                                Upload Modul Ajar
                            </h2>
                            {
                                !uploading && (

                                    <>

                                        <label

                                            className="border-2 border-dashed border-slate-300 rounded-2xl h-56 flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 transition"

                                        >

                                            <Upload

                                                size={48}

                                                className="text-blue-600 mb-3"

                                            />

                                            <p className="font-semibold">

                                                Klik untuk memilih PDF

                                            </p>

                                            <p className="text-sm text-slate-500">

                                                Hanya file PDF

                                            </p>

                                            <input

                                                type="file"

                                                accept=".pdf"

                                                hidden

                                                onChange={(e) => {

                                                    setSelectedFile(

                                                        e.target.files[0]

                                                    );

                                                }}

                                            />

                                        </label>

                                        {

                                            selectedFile && (

                                                <div className="mt-5 bg-slate-100 rounded-xl p-3 flex items-center gap-3">

                                                    <FileText

                                                        className="text-blue-600"

                                                    />

                                                    <span>

                                                        {selectedFile.name}

                                                    </span>

                                                </div>

                                            )

                                        }

                                        <div className="flex justify-end gap-3 mt-8">

                                            <button

                                                onClick={() => {

                                                    setShowModal(false);

                                                    setSelectedFile(null);

                                                }}

                                                className="px-5 py-2 rounded-xl border"

                                            >

                                                Batal

                                            </button>

                                            <button

                                                disabled={!selectedFile}

                                                onClick={handleUpload}

                                                className="px-6 py-2 rounded-xl bg-blue-600 text-white disabled:bg-slate-300"

                                            >

                                                Upload

                                            </button>

                                        </div>

                                    </>

                                )

                            }

                            {

                                uploading && (

                                    <div className="py-6">

                                        <div className="flex flex-col items-center">

                                            {

                                                progress >= 100 ? (

                                                    <CheckCircle

                                                        size={56}

                                                        className="text-green-500"

                                                    />

                                                ) : (

                                                    <Loader2

                                                        size={56}

                                                        className="animate-spin text-blue-600"

                                                    />

                                                )

                                            }

                                            <h3 className="text-xl font-bold mt-4">

                                                Memproses Dokumen

                                            </h3>

                                            <p className="text-slate-500 mt-2">

                                                Jangan menutup halaman ini.

                                            </p>

                                        </div>

                                        <div className="w-full bg-slate-200 rounded-full h-4 mt-8 overflow-hidden">

                                            <div

                                                className="bg-blue-600 h-4 transition-all duration-500"

                                                style={{

                                                    width: `${progress}%`

                                                }}

                                            />

                                        </div>

                                        <div className="flex justify-between mt-2">

                                            <span className="text-sm text-slate-600">

                                                {statusText}

                                            </span>

                                            <span className="font-bold">

                                                {progress}%

                                            </span>

                                        </div>

                                    </div>

                                )

                            }

                        </div>

                    </div>

                )

            }

        </div>

    );

}