import React, { useState, useEffect } from 'react';

interface WelcomeModalProps {
    onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        // Simula um carregamento inicial da página.
        setIsOpen(true)
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75">
            <div className="bg-white rounded-lg p-8 shadow-xl relative w-full max-w-md">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">Bem-vindo!</h2>
                <p className="text-gray-700 mb-6 leading-relaxed">
                    Obrigado por visitar nosso site. Aproveite sua experiência e explore tudo o que temos para oferecer!
                </p>
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    aria-label="Fechar modal"
                >
                    Fechar
                </button>
            </div>
        </div>
    );
};

export default WelcomeModal;