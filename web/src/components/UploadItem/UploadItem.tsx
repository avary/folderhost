import { useState, useRef, useContext } from 'react';
import { FiUpload, FiX, FiCheck, FiLoader, FiFile } from "react-icons/fi";
import ExplorerContext from '../../utils/ExplorerContext';
import axiosInstance from '../../utils/axiosInstance';
import type { AxiosError } from 'axios';

interface FileItem {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

const UploadItem = () => {
    const { path, setShowUploadMenu, readDir } = useContext(ExplorerContext);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [dragActive, setDragActive] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFiles = (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const newFiles: FileItem[] = Array.from(selectedFiles).map(file => ({
            id: `${Date.now()}_${Math.random()}_${file.name}`,
            file: file,
            progress: 0,
            status: 'pending'
        }));

        setFiles(prev => [...prev, ...newFiles]);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const uploadFiles = async () => {
        const pendingFiles = files.filter(f => f.status === 'pending');
        if (pendingFiles.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        setFiles(prev => prev.map(f => 
            f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        const chunkSize: number = 5 * 1024 * 1024;
        let completedFiles = 0;
        
        for (const fileItem of pendingFiles) {
            const file = fileItem.file;
            const totalChunks: number = Math.ceil(file.size / chunkSize);
            const fileID: string = `${Date.now()}_${file.name}`;
            
            try {
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
                    const formData = new FormData();
                    formData.append('file', chunk);
                    formData.append('chunkIndex', i.toString());
                    formData.append('totalChunks', totalChunks.toString());
                    formData.append('fileID', fileID);
                    formData.append('fileName', file.name);

                    const response = await axiosInstance.post(`/upload?path=${path.slice(1)}`, formData);

                    const chunkProgress = ((i + 1) / totalChunks) * 100;
                    setFiles(prev => prev.map(f =>
                        f.id === fileItem.id ? { ...f, progress: chunkProgress } : f
                    ));

                    if (response.data.uploaded) {
                        setFiles(prev => prev.map(f =>
                            f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
                        ));
                        
                        completedFiles++;
                        setUploadProgress((completedFiles / pendingFiles.length) * 100);
                    }
                }
            } catch (error) {
                const err = error as AxiosError<{ err?: string }>;
                setFiles(prev => prev.map(f =>
                    f.id === fileItem.id ? { ...f, status: 'error', error: err.response?.data?.err || "Upload failed" } : f
                ));
                
                completedFiles++;
                setUploadProgress((completedFiles / pendingFiles.length) * 100);
            }
        }

        setUploading(false);
        readDir();
        
        // Auto close after 2 seconds if all files succeeded
        setTimeout(() => {
            if (files.every(f => f.status === 'success')) {
                setShowUploadMenu(false);
                setFiles([]);
            }
        }, 2000);
    };

    const stats = {
        total: files.length,
        pending: files.filter(f => f.status === 'pending').length,
        uploading: files.filter(f => f.status === 'uploading').length,
        success: files.filter(f => f.status === 'success').length,
        error: files.filter(f => f.status === 'error').length
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-700 pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-sky-300">Upload Files</h2>
                    <button
                        onClick={() => {
                            if (!uploading) {
                                setShowUploadMenu(false);
                                setFiles([]);
                            }
                        }}
                        className="text-gray-400 hover:text-red-500 transition"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                {/* Path Info */}
                <div className="bg-gray-900 rounded-lg p-3 mb-4">
                    <p className="text-gray-300 text-sm">Uploading to:</p>
                    <p className="font-mono text-sky-300 text-sm break-all">{path}</p>
                </div>

                {/* Drop Zone */}
                <div
                    className={`relative border-2 border-dashed rounded-lg p-6 transition-all cursor-pointer mb-4
                        ${dragActive ? 'border-sky-400 bg-sky-900/20' : 'border-gray-600 bg-gray-900/50'}
                        hover:border-sky-500 hover:bg-sky-900/10`}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const relatedTarget = e.relatedTarget as Node;
                        if (!e.currentTarget.contains(relatedTarget)) {
                            setDragActive(false);
                        }
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!dragActive) setDragActive(true);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActive(false);
                        const droppedFiles = e.dataTransfer.files;
                        if (droppedFiles && droppedFiles.length > 0) {
                            handleFiles(droppedFiles);
                        }
                    }}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => handleFiles(e.target.files)}
                        disabled={uploading}
                    />
                    <div className="text-center">
                        <FiUpload className="text-4xl mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-300">
                            {dragActive ? 'Drop files here' : 'Drag & drop files here'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            or click to select files
                        </p>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                        <div className="flex justify-between items-center sticky top-0 bg-gray-800 py-2">
                            <span className="text-gray-300 text-sm">{files.length} file(s)</span>
                            {stats.pending > 0 && !uploading && (
                                <button
                                    onClick={() => setFiles([])}
                                    className="text-xs text-red-400 hover:text-red-300"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        {files.map((fileItem) => (
                            <div key={fileItem.id} className="bg-gray-900 rounded-lg p-2">
                                <div className="flex items-center justify-between gap-2">
                                    <FiFile className="text-gray-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm truncate">{fileItem.file.name}</p>
                                        <p className="text-gray-500 text-xs">{formatBytes(fileItem.file.size)}</p>
                                        {fileItem.status === 'uploading' && (
                                            <div className="mt-1">
                                                <div className="w-full bg-gray-700 rounded-full h-1">
                                                    <div
                                                        className="bg-sky-500 h-1 rounded-full transition-all"
                                                        style={{ width: `${fileItem.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {fileItem.status === 'error' && fileItem.error && (
                                            <p className="text-red-400 text-xs mt-1">{fileItem.error}</p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0">
                                        {fileItem.status === 'pending' && !uploading && (
                                            <button onClick={() => removeFile(fileItem.id)} className="text-gray-500 hover:text-red-500">
                                                <FiX size={16} />
                                            </button>
                                        )}
                                        {fileItem.status === 'uploading' && <FiLoader className="animate-spin text-sky-400" size={16} />}
                                        {fileItem.status === 'success' && <FiCheck className="text-green-500" size={16} />}
                                        {fileItem.status === 'error' && <FiX className="text-red-500" size={16} />}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Button */}
                {files.some(f => f.status === 'pending') && (
                    <button
                        className={`w-full py-2 rounded-lg font-semibold transition-all
                            ${uploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700'}
                            text-white`}
                        onClick={uploadFiles}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <FiLoader className="animate-spin" />
                                Uploading {stats.uploading} of {stats.pending + stats.uploading}...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <FiUpload />
                                Upload {stats.pending} File{stats.pending !== 1 ? 's' : ''}
                            </span>
                        )}
                    </button>
                )}

                {/* Global Progress */}
                {uploading && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Overall Progress</span>
                            <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                                className="bg-sky-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadItem;