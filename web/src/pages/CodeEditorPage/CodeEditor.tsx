import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Cookies from 'js-cookie';
import { useNavigate, useParams } from 'react-router-dom';
const CodeEditorComp = lazy(() => import('../../components/CodeEditor/CodeEditorComp.jsx'));
import useWebSocket from '../../utils/useWebSocket.js';
import axiosInstance from '../../utils/axiosInstance.js';
import type { editor } from 'monaco-editor';
import MessageBox from '../../components/minimal/MessageBox/MessageBox.js';

const CodeEditorPage = () => {
    const params = useParams();
    const navigate = useNavigate();
    const [editorLanguage, setEditorLanguage] = useState<string>("plaintext");
    const [fileContent, setFileContent] = useState<string>("")
    const path = params.path;
    const [res, setRes] = useState<string>("");
    const [err, setErr] = useState<string>("");
    const [readOnly, setReadOnly] = useState<boolean>(true);
    const [shouldConnect, setShouldConnect] = useState<boolean>(false)
    const [fileTitle, setFileTitle] = useState<string>("")
    const [writePermission, setWritePermission] = useState<boolean>(false)
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const readOnlyRef = useRef<boolean>(readOnly);
    const {
        isConnected,
        isConnectedRef,
        messages,
        sendMessage
    } = useWebSocket(path?.slice(1) ? path?.slice(1) : "", shouldConnect)

    useEffect(() => {
        readOnlyRef.current = readOnly;
    }, [readOnly]);

    const handleEditorChange = useCallback((event: editor.IModelContentChangedEvent) => {
        sendChangeToWebSocket(event.changes)
    }, [])

    const sendChangeToWebSocket = useCallback((changes: editor.IModelContentChange[]) => {
        if (!isConnectedRef.current || readOnlyRef.current) return;

        changes.forEach((change: editor.IModelContentChange) => {
            let changeType;
            if (change.text && change.range.startLineNumber !== change.range.endLineNumber ||
                change.range.startColumn !== change.range.endColumn) {
                changeType = 'replace';
            } else if (change.text) {
                changeType = 'insert';
            } else {
                changeType = 'delete';
            }

            const delta = JSON.stringify({
                type: 'editor-change',
                path: path?.slice(1),
                change: {
                    type: changeType,
                    range: {
                        startLineNumber: change.range.startLineNumber,
                        startColumn: change.range.startColumn,
                        endLineNumber: change.range.endLineNumber,
                        endColumn: change.range.endColumn
                    },
                    text: change.text || '',
                    timestamp: Date.now()
                }
            });

            sendMessage(delta);
        });
    }, [path]);

    function readFile() {
        setIsLoading(true);
        axiosInstance.get(`/read-file?filepath=${path?.slice(1)}`
        ).then((data) => {
            if (data.data.res) {
                setFileTitle(data.data.title);
                setFileContent(data.data.data);
                setWritePermission(data.data.writePermission);
                setEditorLanguage(detectFileLanguage());
                setShouldConnect(true);
                setIsLoading(false);
            }
        }).catch((err) => {
            setIsLoading(false);
            if (err?.response?.data?.err) {
                setErr(err.response.data.err)
            }
        })
    }

    function detectFileLanguage(): string {
        const extensionToLanguageMap: Record<string, string> = {
            "yml": "yaml",
            "yaml": "yaml",
            "js": "javascript",
            "json": "json",
            "ts": "typescript",
            "mts": "typescript",
            "mjs": "javascript",
            "go": "go",
            "fsx": "fsharp",
            "html": "html",
            "css": "css",
            "php": "php",
            "sh": "shell",
            "bat": "bat",
            "java": "java",
            "kt": "kotlin",
            "py": "python",
            "cs": "csharp",
            "c": "c",
            "cpp": "cpp",
            "sql": "sql",
            "xml": "xml",
            "md": "markdown"
        };

        if (!path) {
            return "plaintext"
        }

        let fileExtension = path.substring(path.lastIndexOf('.') + 1);
        return extensionToLanguageMap[fileExtension] || "plaintext";
    }

    useEffect(() => {
        if (fileTitle) {
            document.title = `${fileTitle} - folderhost`
        }
    }, [fileTitle])

    useEffect(() => {
        if (Cookies.get("token")) {
            readFile()
        } else {
            navigate("/login");
        }
    }, [])

    useEffect(() => {
        if (isConnected) {
            if (writePermission) {
                setReadOnly(false);
                setRes("Connected! You can edit now.");
            } else {
                setReadOnly(true);
                setRes("Connected (Read-only)");
            }

            setTimeout(() => {
                setRes("");
            }, 1000);
            return;
        }

        setReadOnly(true);
        setRes("Connection lost - Read only mode");

    }, [isConnected, writePermission]);

    return (
        <div className="relative">
            <Suspense fallback={
                <div className="flex items-center justify-center h-screen bg-gray-900">
                    <div className="text-white text-xl">Loading Editor...</div>
                </div>
            }>
                <MessageBox isErr={err != ""} message={err} setMessage={setErr} />
                {isLoading && (
                    <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center z-50">
                        <div className="text-white text-xl">Loading file...</div>
                    </div>
                )}
                <CodeEditorComp
                    handleEditorChange={handleEditorChange}
                    editorLanguage={editorLanguage}
                    setEditorLanguage={setEditorLanguage}
                    fileContent={fileContent}
                    response={res}
                    title={fileTitle}
                    readOnly={readOnly}
                    isConnectedRef={isConnectedRef}
                    messages={messages}
                    setRes={setRes}
                    setFileContent={setFileContent}
                    setReadOnly={setReadOnly}
                    readOnlyRef={readOnlyRef}
                />
            </Suspense>
        </div>
    )
}

export default CodeEditorPage;