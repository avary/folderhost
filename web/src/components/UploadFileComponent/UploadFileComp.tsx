import type React from "react";
import { useState, useRef } from "react";
import { FiUpload, FiX, FiCheck, FiLoader, FiFolder, FiFile } from "react-icons/fi";

interface FileItem {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

interface UploadFileCompProps {
    setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>,
    uploadFiles: Function,
    responses: { fileName: string; response: string }[],
    errors: { fileName: string; error: string }[],
    uploadProgress: number,
    path: string,
    uploading: boolean,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
    files: FileItem[],
    className?: string
}

const UploadFileComp: React.FC<UploadFileCompProps> = ({
    setFiles, uploadFiles, responses, errors, uploadProgress, path, uploading, setUploading, files, className = ""
}) => {
    const [dragActive, setDragActive] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const clearAllFiles = () => {
        if (confirm('Remove all files?')) {
            setFiles([]);
            setUploading(false);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const stats = {
        total: files.length,
        pending: files.filter(f => f.status === 'pending').length,
        uploading: files.filter(f => f.status === 'uploading').length,
        success: files.filter(f => f.status === 'success').length,
        error: files.filter(f => f.status === 'error').length
    };

    return (
        <div className={`flex flex-col w-full gap-4 p-6 bg-gray-800 rounded-lg shadow-xl ${className}`}>
            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                <h1 className="text-4xl font-bold text-sky-300">
                    UPLOAD
                </h1>
                <div className="flex gap-2 text-sm">
                    <span className="px-3 py-1 bg-gray-700 rounded-full text-gray-300">
                        <FiFolder className="inline mr-1" size={12} /> {stats.total}
                    </span>
                    {stats.pending > 0 && <span className="px-3 py-1 bg-blue-600 rounded-full text-white">
                        <FiLoader className="inline mr-1" size={12} /> {stats.pending}
                    </span>}
                    {stats.success > 0 && <span className="px-3 py-1 bg-green-600 rounded-full text-white">
                        <FiCheck className="inline mr-1" size={12} /> {stats.success}
                    </span>}
                    {stats.error > 0 && <span className="px-3 py-1 bg-red-600 rounded-full text-white">
                        <FiX className="inline mr-1" size={12} /> {stats.error}
                    </span>}
                </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-3">
                <h2 className="text-gray-300 text-sm">Upload path:</h2>
                <p className="font-mono text-sky-300 text-lg break-all">{path}</p>
            </div>

            <div
                className={`relative border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer
        ${dragActive
                        ? 'border-sky-400 bg-sky-900/20'
                        : 'border-gray-600 bg-gray-900/50'
                    }
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
                    if (!dragActive) {
                        setDragActive(true);
                    }
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
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="text-center">
                    <FiUpload className="text-5xl mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-300 text-lg">
                        {dragActive ? 'Drop files here' : 'Drag & drop files here'}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                        or click to select files
                    </p>
                </div>
            </div>

            {files.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center sticky top-0 bg-gray-800 py-2 z-10">
                        <h3 className="text-gray-300 font-semibold">Files ({files.length})</h3>
                        {stats.pending > 0 && !uploading && (
                            <button
                                onClick={clearAllFiles}
                                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {files.map((fileItem) => {
                        const fileResponse = responses.find(r => r.fileName === fileItem.file.name);
                        const fileError = errors.find(e => e.fileName === fileItem.file.name);

                        return (
                            <div key={fileItem.id}
                                className={`bg-gray-900 rounded-lg p-3 transition-all
                                    ${fileItem.status === 'success' ? 'border-l-4 border-green-500' : ''}
                                    ${fileItem.status === 'error' ? 'border-l-4 border-red-500' : ''}
                                    ${fileItem.status === 'uploading' ? 'border-l-4 border-sky-500' : ''}
                                `}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <FiFile className="text-2xl text-gray-400" />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-white font-medium truncate max-w-md">
                                                    {fileItem.file.name}
                                                </p>
                                                <span className="text-gray-500 text-xs">
                                                    {formatBytes(fileItem.file.size)}
                                                </span>
                                            </div>
                                            {fileItem.status === 'uploading' && (
                                                <div className="mt-2">
                                                    <div className="w-full bg-gray-700 rounded-full h-1.5">
                                                        <div
                                                            className="bg-sky-500 h-1.5 rounded-full transition-all duration-300"
                                                            style={{ width: `${fileItem.progress}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-gray-400 text-xs mt-1">
                                                        {fileItem.progress}% uploaded
                                                    </p>
                                                </div>
                                            )}
                                            {fileResponse && fileItem.status === 'success' && (
                                                <p className="text-green-400 text-sm mt-1">
                                                    {fileResponse.response}
                                                </p>
                                            )}
                                            {fileError && fileItem.status === 'error' && (
                                                <p className="text-red-400 text-sm mt-1">
                                                    {fileError.error}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {fileItem.status === 'pending' && !uploading && (
                                            <button
                                                onClick={() => removeFile(fileItem.id)}
                                                className="text-gray-500 hover:text-red-500 transition p-1"
                                                title="Remove file"
                                            >
                                                <FiX size={18} />
                                            </button>
                                        )}
                                        {fileItem.status === 'uploading' && (
                                            <FiLoader className="animate-spin text-sky-400" size={18} />
                                        )}
                                        {fileItem.status === 'success' && (
                                            <FiCheck className="text-green-500" size={18} />
                                        )}
                                        {fileItem.status === 'error' && (
                                            <FiX className="text-red-500" size={18} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {files.some(f => f.status === 'pending') && (
                <button
                    className={`mt-4 py-3 rounded-lg font-bold text-lg transition-all
                        ${uploading
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-sky-600 hover:bg-sky-700'
                        } text-white`}
                    onClick={() => uploadFiles()}
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

            {uploading && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-400 mb-1">
                        <span>Overall Progress</span>
                        <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default UploadFileComp;