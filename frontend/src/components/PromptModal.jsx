import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PromptModal = ({ isOpen, onClose, onConfirm, title, message, submitText = "Submit", cancelText = "Cancel", placeholder = "", defaultValue = "", isDanger = false }) => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
        }
    }, [isOpen, defaultValue]);

    const handleSubmit = () => {
        onConfirm(value);
        onClose();
        setValue("");
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative z-10"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="p-6">
                            <h3 className={`text-lg font-bold mb-2 ${isDanger ? 'text-red-600' : 'text-slate-800'}`}>
                                {title}
                            </h3>
                            <p className="text-slate-600 text-sm mb-4">
                                {message}
                            </p>
                            <textarea
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                rows="3"
                                placeholder={placeholder}
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!value.trim()}
                                className={`px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm focus:ring-2 focus:ring-offset-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isDanger
                                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                        : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                    }`}
                            >
                                {submitText}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PromptModal;
