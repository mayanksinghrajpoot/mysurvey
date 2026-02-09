import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false, confirmButtonClass }) => {
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
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                {message}
                            </p>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3 gap-2">
                            {/* Cancel Button */}
                            {cancelText && (
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-slate-200 transition-colors"
                                >
                                    {cancelText}
                                </button>
                            )}

                            {/* Confirm Button */}
                            {onConfirm && (
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm focus:ring-2 focus:ring-offset-1 transition-colors ${confirmButtonClass
                                            ? confirmButtonClass
                                            : isDanger
                                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                        }`}
                                >
                                    {confirmText}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
