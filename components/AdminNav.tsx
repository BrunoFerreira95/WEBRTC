// components/AdminNav.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUser } from '@/app/atender/user';

const AdminNav: React.FC = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            const userResponse = await getUser();
            const user = userResponse?.data?.user;
             if (user?.app_metadata?.userrole === '\"admin\"') {
                setIsAdmin(true);
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    if (loading) {
        return null;
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-100 py-4 border-b border-gray-200 w-52">
            <div className="container mx-auto flex justify-center items-center max-w-sm">
                <ul className="flex space-x-6">
                    <li>
                        <Link href="/admin" className="text-gray-700 hover:text-gray-900 font-medium">
                            Admin
                        </Link>
                    </li>
                    <li>
                        <Link href="/ligar" className="text-gray-700 hover:text-gray-900 font-medium">
                            Ligar
                        </Link>
                    </li>
                    <li>
                        <Link href="/atender" className="text-gray-700 hover:text-gray-900 font-medium">
                            Atender
                        </Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default AdminNav;