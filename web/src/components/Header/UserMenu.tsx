import React, { useState, useRef, useEffect } from 'react';
import { FaUser } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import Cookies from 'js-cookie';

interface UserMenuProps {
    username: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ username }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleLogout = () => {
        axiosInstance.put("/logout").then(() => {
            Cookies.remove("token");
            navigate("/login");
        });
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            {/* User Profile trigger */}
            <div
                className="flex min-w-24 items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="p-1.5 bg-sky-500 rounded-full">
                    <FaUser className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <span className="text-white font-medium select-none">{username}</span>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 py-1 z-50">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left text-white hover:bg-slate-700 hover:text-sky-400 transition-colors"
                    >
                        <FiLogOut size={18} />
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserMenu;
