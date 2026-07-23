import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Upload,
    FileText,
    Trash2,
    Loader2,
    CheckCircle
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

    }, []);



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
            </div>
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