import { useContext } from "react"
import ExplorerContext from "../../utils/ExplorerContext"
import { RiDeleteBin6Fill } from "react-icons/ri";
import { FaDownload, FaCopy, FaFileArchive, FaArrowUp } from "react-icons/fa";
import ExplorerRMItem from "./ExplorerRMItem";
import { MdDriveFileRenameOutline } from "react-icons/md";


interface ExplorerRightclickMenuProps {
    x: number, y: number
}

const ExplorerRightclickMenu: React.FC<ExplorerRightclickMenuProps> = ({ x, y }) => {
    const {
        itemInfo,
        permissions,
        showDisabled,
        deleteItem,
        createCopy,
        unzipProgress,
        startUnzipping,
        downloadFile,
        setShowRenameItemMenu,
        selectedItems,
        downloadProgress,
        moveItem,
        getParent,
        path
    } = useContext(ExplorerContext)

    const iconSize = 20;

    if (selectedItems.length > 1) {
        return null;
    }

    const moveToParent = () => {
        if (itemInfo?.isDirectory) {
            let parentOfDir = itemInfo.parentPath;
            parentOfDir = getParent(parentOfDir.slice(0, -1));
            moveItem(itemInfo.path, parentOfDir)
        } else if (itemInfo) {
            moveItem(itemInfo?.path, getParent(getParent(itemInfo?.path)))
        }
    };

    return (
        <div
            style={{ top: `${y}px`, left: `${x}px` }}
            className='flex flex-col items-start bg-slate-900 rounded-lg text-white p-1 fixed z-20 w-44'
        >
            {
                permissions?.delete ?
                    <ExplorerRMItem
                        title='Click to delete.'
                        onClick={() => {
                            if (!window.confirm("Are you sure you want to delete this file?")) {
                                return;
                            }
                            deleteItem(itemInfo)
                        }}>
                        <RiDeleteBin6Fill size={iconSize} />Delete
                    </ExplorerRMItem>
                    : showDisabled === true ?
                        <ExplorerRMItem
                            isDisabled={true}
                            title="No permission">
                            <RiDeleteBin6Fill size={iconSize} />Delete
                        </ExplorerRMItem>
                        : null
            }

            {
                permissions?.rename ?
                    <ExplorerRMItem
                        title='Click to rename.'
                        onClick={() => {
                            setShowRenameItemMenu(true)
                        }}>
                        <MdDriveFileRenameOutline size={iconSize} />Rename
                    </ExplorerRMItem>
                    : showDisabled === true ?
                        <ExplorerRMItem
                            isDisabled={true}
                            title="No permission">
                            <MdDriveFileRenameOutline size={iconSize} />Rename
                        </ExplorerRMItem>
                        : null
            }

            {/* Move to parent folder */}
            {path !== "./" && itemInfo?.path !== "./" && (
                <ExplorerRMItem
                    title='Move to parent folder'
                    onClick={moveToParent}
                >
                    <FaArrowUp size={iconSize} /> Move Up
                </ExplorerRMItem>
            )}

            {!downloadProgress && !itemInfo?.isDirectory ?
                permissions?.download_files ?
                    <ExplorerRMItem
                        title='Click to download.'
                        onClick={() => {
                            downloadFile(itemInfo?.path)
                        }}
                    ><FaDownload size={iconSize} /> Download</ExplorerRMItem> : showDisabled === true ?
                        <ExplorerRMItem
                            title='No permission!'
                            isDisabled={true}
                        ><FaDownload size={iconSize} />Download</ExplorerRMItem> : null
                : !itemInfo?.isDirectory && downloadProgress ?
                    <ExplorerRMItem
                        isDisabled={true}
                    ><FaDownload size={iconSize} />Downloading...</ExplorerRMItem> : null}

            <ExplorerRMItem
                title='Click to create a copy.'
                onClick={() => { createCopy(itemInfo) }}>
                <FaCopy size={iconSize} />Create Copy
            </ExplorerRMItem>
            {(itemInfo?.name.split(".").pop() === "zip" && unzipProgress === "") && !itemInfo?.isDirectory ?
                (permissions?.extract ?
                    <ExplorerRMItem
                        title='Click to unzip.'
                        onClick={() => {
                            startUnzipping()
                        }}
                    ><FaFileArchive size={iconSize} />Unzip</ExplorerRMItem> : showDisabled === true ?
                        <ExplorerRMItem
                            title='No permission!'
                            isDisabled={true}
                        ><FaFileArchive size={iconSize} />Unzip</ExplorerRMItem> : null)
                : (itemInfo?.name.split(".").pop() === "zip" && unzipProgress !== "") && !itemInfo?.isDirectory ?
                    <ExplorerRMItem
                        title='Unzipping...'
                        isDisabled={true}
                    ><FaFileArchive size={iconSize} />Unzipping...</ExplorerRMItem> : null
            }
        </div>
    )
}

export default ExplorerRightclickMenu