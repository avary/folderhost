import UploadFileComp from '../../components/UploadFileComponent/UploadFileComp.jsx';
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom';
import Cookies from 'js-cookie';
import axiosInstance from '../../utils/axiosInstance.js';
import type { AxiosError } from 'axios';

interface FileItem {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
}

interface UploadResponse {
    fileName: string;
    response: string;
}

interface UploadError {
    fileName: string;
    error: string;
}

const UploadFile = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [path] = useState<string>(params.path ?? "./");
    const [files, setFiles] = useState<FileItem[]>([]);
    const [responses, setResponses] = useState<UploadResponse[]>([]);
    const [errors, setErrors] = useState<UploadError[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const [uploadProgress, setUploadProgress] = useState<number>(0);

    useEffect(() => {
        document.title = "Upload - folderhost";
        if (!Cookies.get("ip") && !Cookies.get("token")) {
            navigate("/login");
        }
    }, [navigate]);

    async function uploadFiles() {
        const pendingFiles = files.filter(f => f.status === 'pending');
        if (pendingFiles.length === 0) {
            alert("Please select files to upload!");
            return;
        }

        setUploading(true);
        setResponses([]);
        setErrors([]);
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
                        setResponses(prev => [...prev, {
                            fileName: file.name,
                            response: response.data.response
                        }]);
                        
                        setFiles(prev => prev.map(f =>
                            f.id === fileItem.id ? { ...f, status: 'success', progress: 100 } : f
                        ));
                        
                        completedFiles++;
                        setUploadProgress((completedFiles / pendingFiles.length) * 100);
                    }
                }
            } catch (error) {
                const err = error as AxiosError<{ err?: string }>;
                console.error(err);
                setErrors(prev => [...prev, {
                    fileName: file.name,
                    error: err.response?.data?.err || "Upload failed"
                }]);
                
                setFiles(prev => prev.map(f =>
                    f.id === fileItem.id ? { ...f, status: 'error', error: err.response?.data?.err || "Upload failed" } : f
                ));
                
                completedFiles++;
                setUploadProgress((completedFiles / pendingFiles.length) * 100);
            }
        }

        setUploading(false);
    }

    return (
        <div className="min-h-screen bg-gray-900">
            <UploadFileComp
                setFiles={setFiles}
                uploadFiles={uploadFiles}
                responses={responses}
                errors={errors}
                uploadProgress={uploadProgress}
                path={path}
                uploading={uploading}
                setUploading={setUploading}
                files={files}
                className="mx-auto max-w-4xl mt-10"
            />
        </div>
    );
}

export default UploadFile;